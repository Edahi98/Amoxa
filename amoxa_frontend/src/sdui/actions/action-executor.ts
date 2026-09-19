import { ApiClient } from '@utils-api/ApiClient.js';
import { ApiDownload } from '@utils-api/ApiDownload.js';
import { ApiError } from '@utils-api/ApiError.js';
import { PathResolver } from '@sdui-path/path-resolver';
import { PathTokenizer } from '@sdui-path/path-tokenizer';
import { RuleEvaluator } from '@sdui-rules/rule-evaluator';
import { StateMachineGuard } from '@sdui-rules/state-machine-guard';
import { IdGenerator } from '@sdui-actions/id-generator';
import { PlaceholderResolver } from '@sdui-actions/placeholder-resolver';
import type { ActionEnvironment, ToastTone } from '@sdui-actions/action-environment';
import type { ActionOutcome } from '@sdui-actions/action-outcome';
import type { ActionModel } from '@sdui-model/action.model';
import type { ScreenModel } from '@sdui-model-screen/screen.model';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import type { OfflineQueue } from '@sdui-offline-queue/offline-queue';

export interface ActionExecutorDeps {
  screen: ScreenModel;
  environment: ActionEnvironment;
  queue: OfflineQueue;
}

export class ActionExecutor {
  private static readonly MAX_CHAIN_DEPTH = 8;
  private static readonly TONES: readonly ToastTone[] = ['info', 'success', 'warning', 'danger'];

  private readonly screen: ScreenModel;
  private readonly env: ActionEnvironment;
  private readonly queue: OfflineQueue;
  private readonly rules: RuleEvaluator;
  private readonly guard: StateMachineGuard;
  private readonly pathResolver: PathResolver;
  private readonly placeholders: PlaceholderResolver;

  constructor(deps: ActionExecutorDeps) {
    this.screen = deps.screen;
    this.env = deps.environment;
    this.queue = deps.queue;
    this.rules = new RuleEvaluator(deps.screen.rules);
    this.guard = new StateMachineGuard(deps.screen.stateMachine, this.rules);
    this.pathResolver = new PathResolver(new PathTokenizer());
    this.placeholders = new PlaceholderResolver(this.pathResolver);
  }

  public async execute(actionId: string, extraParams: Record<string, unknown> = {}, depth = 0): Promise<ActionOutcome> {
    const action = this.screen.actions[actionId];
    if (!action) return { status: 'unknown', message: `Acción desconocida: ${actionId}` };
    if (depth > ActionExecutor.MAX_CHAIN_DEPTH) return { status: 'error', message: 'Cadena de acciones demasiado larga' };

    const blocked = this.checkAllowed(actionId, action);
    if (blocked) return blocked;

    if (action.type !== 'confirm' && action.confirmText !== undefined) {
      const accepted = await this.env.confirm(action.confirmText);
      if (!accepted) return { status: 'cancelled' };
    }

    switch (action.type) {
      case 'navigate':
        return this.navigate(action, extraParams, false);
      case 'open_modal':
        return this.navigate(action, extraParams, true);
      case 'refresh':
        this.env.reload();
        return { status: 'ok' };
      case 'close':
        this.env.closeModal();
        return { status: 'ok' };
      case 'logout':
        this.env.logout();
        return { status: 'ok' };
      case 'toast':
        return this.toast(action, extraParams);
      case 'confirm':
        return this.confirm(action, depth);
      case 'sync_now':
        return this.syncNow(action, depth);
      case 'capture_media':
        return this.captureMedia(action, extraParams);
      case 'submit':
      case 'call_api':
        return this.request(actionId, action, extraParams, depth);
    }
  }

  private checkAllowed(actionId: string, action: ActionModel): ActionOutcome | null {
    const context = this.env.getContext();
    const decision = this.guard.check(actionId, context);
    if (!decision.allowed) {
      this.env.toast(decision.message ?? 'Esta acción no está disponible.', 'warning');
      if (decision.denial === 'requires') this.env.notifyBlocked();
      return { status: 'blocked', message: decision.message };
    }

    const blocking = this.rules.blocking(action.requiresRules ?? [], context);
    if (blocking.length > 0) {
      const message = blocking[0].message;
      this.env.toast(message, 'warning');
      this.env.notifyBlocked();
      return { status: 'blocked', message };
    }
    return null;
  }

  private navigate(action: ActionModel, extra: Record<string, unknown>, modal: boolean): ActionOutcome {
    if (action.screenId === undefined) {
      this.env.toast('La acción no indica a qué pantalla ir.', 'danger');
      return { status: 'error', message: 'Falta screen_id' };
    }
    const source = this.source(this.env.getContext(), extra);
    const params = this.placeholders.deep({ ...action.params, ...extra }, source) as Record<string, unknown>;
    if (modal) this.env.openModal(action.screenId, params);
    else this.env.navigate(action.screenId, params);
    return { status: 'ok' };
  }

  private toast(action: ActionModel, extra: Record<string, unknown>): ActionOutcome {
    const raw = action.params?.['message'] ?? action.payload?.['message'] ?? extra['message'];
    if (typeof raw !== 'string' || raw === '') return { status: 'error', message: 'Falta el mensaje' };

    const toneRaw = action.params?.['tone'] ?? action.payload?.['tone'] ?? extra['tone'];
    const tone = this.toneOf(toneRaw);
    const message = this.placeholders.text(raw, this.source(this.env.getContext(), extra));
    this.env.toast(message, tone);
    return { status: 'ok', message };
  }

  private async confirm(action: ActionModel, depth: number): Promise<ActionOutcome> {
    const accepted = await this.env.confirm(action.confirmText ?? '¿Deseas continuar?');
    if (!accepted) return { status: 'cancelled' };
    await this.chain(action.onSuccess, {}, depth);
    return { status: 'ok' };
  }

  private async syncNow(action: ActionModel, depth: number): Promise<ActionOutcome> {
    const result = await this.env.syncNow();
    if (result.offline) {
      this.env.toast('Sin conexión. Los cambios siguen guardados en el dispositivo.', 'warning');
      return { status: 'error', message: 'offline' };
    }
    if (result.conflicts > 0 || result.failed > 0) {
      this.env.toast('Algunos cambios no se pudieron sincronizar. Revisa el estado de sincronización.', 'danger');
      await this.chain(action.onError, {}, depth);
      return { status: 'error' };
    }
    this.env.toast(result.synced > 0 ? `Se sincronizaron ${result.synced} cambios.` : 'Todo está sincronizado.', 'success');
    await this.chain(action.onSuccess, {}, depth);
    return { status: 'ok' };
  }

  private async captureMedia(action: ActionModel, extra: Record<string, unknown>): Promise<ActionOutcome> {
    const started = await this.env.captureMedia({ ...action.params, ...extra });
    if (!started) {
      this.env.toast('Esta pantalla no tiene un control para capturar evidencia.', 'warning');
      return { status: 'error', message: 'Sin control de evidencia' };
    }
    return { status: 'ok' };
  }

  private async request(actionId: string, action: ActionModel, extra: Record<string, unknown>, depth: number): Promise<ActionOutcome> {
    if (action.endpoint === undefined) {
      return this.fail(action, 'La acción no indica un endpoint.', depth);
    }

    const context = this.env.getContext();
    const source = this.source(context, extra);
    const method = action.method ?? (action.type === 'submit' ? 'POST' : 'GET');
    const endpoint = this.placeholders.endpoint(action.endpoint, source);

    if (endpoint.missing.length > 0) {
      this.env.notifyBlocked();
      return this.fail(action, 'Faltan datos para completar la acción.', depth, 'blocked');
    }

    const hasBody = method !== 'GET';
    const payload = hasBody ? (action.payload !== undefined ? this.placeholders.deep(action.payload, source) : (context.data ?? {})) : undefined;
    const headers: Record<string, string> = {};
    if (hasBody) {
      const key = action.idempotencyKey === undefined ? undefined : this.placeholders.text(action.idempotencyKey, source);
      headers['Idempotency-Key'] = key && key !== '' ? key : IdGenerator.uuid();
    }
    if (action.ifVersion !== undefined) headers['If-Version'] = String(action.ifVersion);

    const canQueue = hasBody && context.offline?.enabled === true;

    if (!this.env.isOnline()) {
      if (canQueue) return this.enqueue(actionId, action, method, endpoint.value, payload, headers, context, depth);
      return this.fail(action, 'Sin conexión. Esta acción necesita conexión a internet.', depth);
    }

    try {
      const response = await ApiClient.request<unknown>({
        method,
        path: endpoint.value,
        token: this.env.getToken(),
        body: payload,
        headers,
      });
      if (response instanceof ApiDownload) {
        this.env.download(response);
        this.env.toast('Documento descargado.', 'success');
      } else if (action.type === 'call_api') {
        this.applyResponse(response);
      }
      if (hasBody && action.onSuccess === undefined) this.env.toast('Cambios guardados.', 'success');
      await this.chain(action.onSuccess, {}, depth);
      return { status: 'ok', response };
    } catch (error) {
      if (!(error instanceof ApiError)) return this.fail(action, 'No se pudo completar la acción.', depth);
      if (error.isNetworkError && canQueue) {
        return this.enqueue(actionId, action, method, endpoint.value, payload, headers, context, depth);
      }
      if (error.isUnauthorized) return { status: 'error', message: error.message };
      return this.fail(action, this.describe(error), depth);
    }
  }

  private async enqueue(
    actionId: string,
    action: ActionModel,
    method: NonNullable<ActionModel['method']>,
    endpoint: string,
    payload: unknown,
    headers: Record<string, string>,
    context: ScreenContextModel,
    depth: number,
  ): Promise<ActionOutcome> {
    this.queue.enqueue({
      id: IdGenerator.uuid(),
      screenId: this.screen.screenId,
      actionId,
      method,
      endpoint,
      payload,
      idempotencyKey: headers['Idempotency-Key'] ?? IdGenerator.uuid(),
      ifVersion: action.ifVersion,
      conflictPolicy: context.offline?.conflictPolicy ?? 'manual',
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
    });
    this.env.toast('Guardado sin conexión. Se sincronizará cuando vuelva la conexión.', 'warning');
    if (action.optimistic) await this.chain(action.onSuccess, {}, depth);
    return { status: 'queued' };
  }

  private applyResponse(response: unknown): void {
    if (typeof response !== 'object' || response === null || Array.isArray(response)) return;
    Object.entries(response).forEach(([key, value]) => this.env.setData(key, value));
  }

  private async fail(action: ActionModel, message: string, depth: number, status: 'error' | 'blocked' = 'error'): Promise<ActionOutcome> {
    if (action.onError !== undefined) {
      await this.chain(action.onError, { message }, depth);
    } else {
      this.env.toast(message, 'danger');
    }
    return { status, message };
  }

  private describe(error: ApiError): string {
    if (error.isConflict) return 'El registro cambió en el servidor. Actualiza la pantalla e inténtalo de nuevo.';
    if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (error.status >= 500) return 'El servidor no pudo completar la acción. Inténtalo más tarde.';
    return error.message;
  }

  private async chain(actionId: string | undefined, extra: Record<string, unknown>, depth: number): Promise<void> {
    if (actionId === undefined) return;
    await this.execute(actionId, extra, depth + 1);
  }

  private toneOf(raw: unknown): ToastTone {
    if (raw === 'error') return 'danger';
    return ActionExecutor.TONES.find((tone) => tone === raw) ?? 'info';
  }

  private source(context: ScreenContextModel, params: Record<string, unknown>): Record<string, unknown> {
    return {
      user: context.user,
      entity: context.entity,
      data: context.data,
      offline: context.offline,
      clauseRefs: context.clauseRefs,
      params,
    };
  }
}

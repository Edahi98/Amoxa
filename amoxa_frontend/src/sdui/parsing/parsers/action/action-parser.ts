import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support/parse-error-collector';
import { ActionModel } from '@sdui-model/action.model';
import { ACTION_METHODS, ACTION_TYPES } from '@sdui-model/sdui-enums';

export class ActionParser extends AbstractNodeParser<ActionModel> {
  constructor(guard: InputGuard) {
    super(guard);
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto action';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): ActionModel | undefined {
    const type = input['type'];
    if (!this.guard.includesValue(ACTION_TYPES, type)) {
      errors.add(`${path}.type`, `tipo de action desconocido: ${String(type)}`);
      return undefined;
    }

    return new ActionModel({
      type,
      screenId: typeof input['screen_id'] === 'string' ? input['screen_id'] : undefined,
      params: this.guard.isRecord(input['params']) ? input['params'] : undefined,
      method: this.guard.includesValue(ACTION_METHODS, input['method']) ? input['method'] : undefined,
      endpoint: typeof input['endpoint'] === 'string' ? input['endpoint'] : undefined,
      payload: this.guard.isRecord(input['payload']) ? input['payload'] : undefined,
      idempotencyKey: typeof input['idempotency_key'] === 'string' ? input['idempotency_key'] : undefined,
      ifVersion: typeof input['if_version'] === 'number' ? input['if_version'] : undefined,
      optimistic: typeof input['optimistic'] === 'boolean' ? input['optimistic'] : undefined,
      requiresRules: Array.isArray(input['requires_rules'])
        ? input['requires_rules'].filter((v): v is string => typeof v === 'string')
        : undefined,
      onSuccess: typeof input['on_success'] === 'string' ? input['on_success'] : undefined,
      onError: typeof input['on_error'] === 'string' ? input['on_error'] : undefined,
      confirmText: typeof input['confirm_text'] === 'string' ? input['confirm_text'] : undefined,
    });
  }
}

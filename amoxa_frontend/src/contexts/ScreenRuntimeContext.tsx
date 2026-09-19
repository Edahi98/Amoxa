import { createContext, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { FileDownloader } from '@utils-api/FileDownloader.js';
import { PathResolver } from '@sdui-path/path-resolver';
import { PathTokenizer } from '@sdui-path/path-tokenizer';
import { PathWriter } from '@sdui-path/path-writer';
import { RuleEvaluator } from '@sdui-rules/rule-evaluator';
import { StateMachineGuard } from '@sdui-rules/state-machine-guard';
import { ActionExecutor } from '@sdui-actions/action-executor';
import { IdGenerator } from '@sdui-actions/id-generator';
import { ChangeDispatcher } from '@sdui-runtime/change-dispatcher';
import { MediaCaptureFocus } from '@sdui-runtime-focus/media-capture-focus';
import { ScreenContextFactory } from '@sdui-runtime-screen/screen-context-factory';
import { ValidationPresenter, type RuleSummaryEntry } from '@sdui-runtime-validation/validation-presenter';
import { OfflineRuntime } from '@sdui-offline/offline-runtime';
import type { ActionEnvironment, ToastTone } from '@sdui-actions/action-environment';
import type { ActionOutcome } from '@sdui-actions/action-outcome';
import type { ComponentModel } from '@sdui-model-component/component.model';
import type { ScreenModel } from '@sdui-model-screen/screen.model';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import type { OfflineQueue } from '@sdui-offline-queue/offline-queue';
import type { SyncManager, SyncSnapshot } from '@sdui-offline/sync-manager';
import type { ChangeTiming } from '@sdui-registry/render-context';
import type { ConfirmRequest, ModalState, RuntimeHost, RuntimeToast } from '@sdui-runtime/runtime-types';

export interface ScreenRuntimeValue {
  screen: ScreenModel;
  host: RuntimeHost;
  context: ScreenContextModel;
  sync: SyncSnapshot;
  toasts: readonly RuntimeToast[];
  modal: ModalState | null;
  confirmRequest: ConfirmRequest | null;
  summary: readonly RuleSummaryEntry[];
  summaryFocusToken: number;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown, componentId?: string): void;
  scheduleChange(componentId: string, actionId: string, timing: ChangeTiming): void;
  dispatch(actionId: string, extraParams?: Record<string, unknown>): Promise<ActionOutcome>;
  isVisible(node: ComponentModel): boolean;
  isEnabled(node: ComponentModel): boolean;
  errorFor(node: ComponentModel): string | undefined;
  actionAllowed(actionId: string): boolean;
  isBusy(actionId: string): boolean;
  dismissToast(id: string): void;
  closeModal(): void;
  resolveConfirm(accepted: boolean): void;
}

export const ScreenRuntimeContext = createContext<ScreenRuntimeValue | undefined>(undefined);

export interface ScreenRuntimeProviderProps {
  screen: ScreenModel;
  host: RuntimeHost;
  sync?: SyncManager;
  queue?: OfflineQueue;
  isOnline?: () => boolean;
  revealErrors?: boolean;
  children?: ReactNode;
}

const TYPING_DELAY_MS = 500;
const MAX_TOASTS = 4;
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

export function ScreenRuntimeProvider({ screen, host, sync, queue, isOnline, revealErrors = false, children }: ScreenRuntimeProviderProps) {
  const syncManager = sync ?? OfflineRuntime.sync();
  const offlineQueue = queue ?? OfflineRuntime.queue();
  const checkOnline = isOnline ?? OfflineRuntime.isOnline;

  const [data, setDataState] = useState<Record<string, unknown>>(() => screen.context.data ?? {});
  const [touched, setTouched] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [submitted, setSubmitted] = useState(revealErrors);
  const [toasts, setToasts] = useState<readonly RuntimeToast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [running, setRunning] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [summaryFocusToken, setSummaryFocusToken] = useState(0);

  const dataRef = useRef(data);
  const hostRef = useRef(host);
  const modalRef = useRef(modal);
  const confirmRef = useRef<ConfirmRequest | null>(null);
  useEffect(() => {
    hostRef.current = host;
    modalRef.current = modal;
  }, [host, modal]);

  const dispatcher = useMemo(() => new ChangeDispatcher(), []);
  const resolver = useMemo(() => new PathResolver(new PathTokenizer()), []);
  const writer = useMemo(() => new PathWriter(new PathTokenizer()), []);
  const evaluator = useMemo(() => new RuleEvaluator(screen.rules), [screen]);
  const guard = useMemo(() => new StateMachineGuard(screen.stateMachine, evaluator), [screen, evaluator]);
  const presenter = useMemo(() => new ValidationPresenter(screen, evaluator), [screen, evaluator]);
  const context = useMemo(() => ScreenContextFactory.withData(screen.context, data), [screen, data]);

  const subscribe = useCallback((listener: () => void) => syncManager.subscribe(listener), [syncManager]);
  const getSnapshot = useCallback(() => syncManager.getSnapshot(), [syncManager]);
  const syncSnapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const writeData = useCallback(
    (path: string, value: unknown) => {
      const next = writer.set(dataRef.current, path, value);
      dataRef.current = next;
      setDataState(next);
    },
    [writer],
  );

  const pushToast = useCallback((message: string, tone: ToastTone) => {
    setToasts((current) => [...current.slice(-(MAX_TOASTS - 1)), { id: IdGenerator.uuid(), message, tone }]);
  }, []);

  const environment = useMemo<ActionEnvironment>(
    () => ({
      navigate: (screenId, params) => hostRef.current.navigate(screenId, params),
      reload: () => hostRef.current.reload(),
      openModal: (screenId, params) => setModal({ screenId, params }),
      closeModal: () => {
        if (modalRef.current) setModal(null);
        else hostRef.current.closeModal?.();
      },
      toast: pushToast,
      confirm: (text) =>
        new Promise<boolean>((resolve) => {
          const request: ConfirmRequest = { text, resolve };
          confirmRef.current = request;
          setConfirmRequest(request);
        }),
      logout: () => hostRef.current.logout(),
      syncNow: () => syncManager.flush(),
      captureMedia: (params) => Promise.resolve(MediaCaptureFocus.focus(screen.root, params)),
      getContext: () => ScreenContextFactory.withData(screen.context, dataRef.current),
      setData: writeData,
      getToken: () => hostRef.current.getToken(),
      isOnline: checkOnline,
      download: (file) => FileDownloader.save(file),
      notifyBlocked: () => {
        setSubmitted(true);
        setSummaryFocusToken((token) => token + 1);
      },
    }),
    [pushToast, screen, syncManager, writeData, checkOnline],
  );

  const executor = useMemo(() => new ActionExecutor({ screen, environment, queue: offlineQueue }), [screen, environment, offlineQueue]);

  useEffect(() => () => dispatcher.cancelAll(), [dispatcher]);

  const dispatch = useCallback(
    async (actionId: string, extraParams: Record<string, unknown> = {}): Promise<ActionOutcome> => {
      setRunning((current) => new Set(current).add(actionId));
      try {
        return await executor.execute(actionId, extraParams);
      } finally {
        setRunning((current) => {
          const next = new Set(current);
          next.delete(actionId);
          return next;
        });
      }
    },
    [executor],
  );

  const value = useMemo<ScreenRuntimeValue>(() => {
    const isRevealed = (componentId: string) => submitted || touched.has(componentId);

    return {
      screen,
      host,
      context,
      sync: syncSnapshot,
      toasts,
      modal,
      confirmRequest,
      summary: presenter.summary(context, isRevealed),
      summaryFocusToken,
      getValue: (path) => resolver.resolve(data, path),
      setValue: (path, next, componentId) => {
        writeData(path, next);
        if (componentId !== undefined) setTouched((current) => new Set(current).add(componentId));
      },
      scheduleChange: (componentId, actionId, timing) => {
        dispatcher.schedule(componentId, timing === 'typing' ? TYPING_DELAY_MS : 0, () => {
          void dispatch(actionId);
        });
      },
      dispatch,
      isVisible: (node) => node.visibleIf === undefined || node.visibleIf.evaluate(context),
      isEnabled: (node) => node.enabledIf === undefined || node.enabledIf.evaluate(context),
      errorFor: (node) => {
        if (!isRevealed(node.id)) return undefined;
        const bound = node.bind === undefined ? undefined : resolver.resolve(data, node.bind);
        return presenter.errorFor(node, bound, context);
      },
      actionAllowed: (actionId) => guard.check(actionId, context).denial !== 'role',
      isBusy: (actionId) => running.has(actionId),
      dismissToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
      closeModal: () => environment.closeModal(),
      resolveConfirm: (accepted) => {
        const request = confirmRef.current;
        confirmRef.current = null;
        setConfirmRequest(null);
        request?.resolve(accepted);
      },
    };
  }, [
    screen,
    host,
    context,
    data,
    syncSnapshot,
    toasts,
    modal,
    confirmRequest,
    presenter,
    summaryFocusToken,
    submitted,
    touched,
    running,
    resolver,
    writeData,
    dispatcher,
    dispatch,
    guard,
    environment,
  ]);

  return <ScreenRuntimeContext.Provider value={value}>{children}</ScreenRuntimeContext.Provider>;
}

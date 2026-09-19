export type ActionOutcomeStatus = 'ok' | 'queued' | 'blocked' | 'cancelled' | 'error' | 'unknown';

export interface ActionOutcome {
  status: ActionOutcomeStatus;
  message?: string;
  response?: unknown;
}

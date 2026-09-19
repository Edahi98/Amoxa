import type { ActionMethod, ConflictPolicy } from '@sdui-model/sdui-enums';

export type QueuedRequestStatus = 'pending' | 'conflict' | 'failed';

export interface QueuedRequest {
  id: string;
  screenId: string;
  actionId: string;
  method: ActionMethod;
  endpoint: string;
  payload?: unknown;
  idempotencyKey: string;
  ifVersion?: number;
  conflictPolicy: ConflictPolicy;
  createdAt: string;
  attempts: number;
  status: QueuedRequestStatus;
  lastError?: string;
}

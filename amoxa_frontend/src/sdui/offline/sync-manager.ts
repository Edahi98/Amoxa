import { ApiClient } from '@utils-api/ApiClient.js';
import { ApiError } from '@utils-api/ApiError.js';
import type { OfflineQueue } from '@sdui-offline-queue/offline-queue';
import type { QueuedRequest } from '@sdui-offline-queue/queued-request';

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';

export interface SyncSnapshot {
  state: SyncState;
  pending: number;
  unresolved: number;
  syncing: boolean;
  lastSyncAt?: string;
}

export interface SyncResult {
  synced: number;
  discarded: number;
  conflicts: number;
  failed: number;
  remaining: number;
  offline: boolean;
}

export interface SyncManagerOptions {
  getToken: () => string | null;
  isOnline: () => boolean;
  now?: () => Date;
}

export interface SyncEventTarget {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

type SyncListener = () => void;
type SendOutcome = 'continue' | 'stop';

export class SyncManager {
  private readonly queue: OfflineQueue;
  private readonly options: SyncManagerOptions;
  private readonly listeners = new Set<SyncListener>();
  private inflight: Promise<SyncResult> | null = null;
  private syncing = false;
  private snapshot: SyncSnapshot;

  constructor(queue: OfflineQueue, options: SyncManagerOptions) {
    this.queue = queue;
    this.options = options;
    this.snapshot = this.compute();
    this.queue.subscribe(() => this.refresh());
  }

  public getSnapshot(): SyncSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public refresh(): void {
    const next = this.compute();
    const current = this.snapshot;
    const same =
      next.state === current.state &&
      next.pending === current.pending &&
      next.unresolved === current.unresolved &&
      next.syncing === current.syncing &&
      next.lastSyncAt === current.lastSyncAt;
    if (same) return;
    this.snapshot = next;
    Array.from(this.listeners).forEach((listener) => listener());
  }

  public attach(target: SyncEventTarget): () => void {
    const onOnline = () => {
      void this.flush();
    };
    const onOffline = () => this.refresh();
    target.addEventListener('online', onOnline);
    target.addEventListener('offline', onOffline);
    return () => {
      target.removeEventListener('online', onOnline);
      target.removeEventListener('offline', onOffline);
    };
  }

  public flush(): Promise<SyncResult> {
    if (this.inflight) return this.inflight;
    this.inflight = this.run().finally(() => {
      this.inflight = null;
      this.syncing = false;
      this.refresh();
    });
    return this.inflight;
  }

  public discard(id: string): void {
    this.queue.remove(id);
  }

  public retry(id: string, overwrite = false): void {
    this.queue.update(id, overwrite ? { status: 'pending', attempts: 0, ifVersion: undefined } : { status: 'pending', attempts: 0 });
  }

  private async run(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, discarded: 0, conflicts: 0, failed: 0, remaining: 0, offline: false };

    if (!this.options.isOnline()) {
      result.offline = true;
      result.remaining = this.queue.count();
      return result;
    }

    this.syncing = true;
    this.refresh();

    let stopped = false;
    for (const item of this.queue.pending()) {
      const outcome = await this.send(item, result);
      if (outcome === 'stop') {
        stopped = true;
        break;
      }
    }

    result.remaining = this.queue.count();
    if (!stopped && result.remaining === 0) {
      this.queue.markSynced((this.options.now ?? (() => new Date()))().toISOString());
    }
    return result;
  }

  private async send(item: QueuedRequest, result: SyncResult): Promise<SendOutcome> {
    const failure = await this.attempt(item, true);
    if (failure === null) return this.succeed(item, result);
    if (failure.isNetworkError || failure.isUnauthorized) {
      result.offline = failure.isNetworkError;
      return 'stop';
    }
    if (failure.isConflict) return this.resolveConflict(item, result);
    return this.fail(item, failure, result);
  }

  private async resolveConflict(item: QueuedRequest, result: SyncResult): Promise<SendOutcome> {
    if (item.conflictPolicy === 'server_wins') {
      this.queue.remove(item.id);
      result.discarded += 1;
      return 'continue';
    }

    if (item.conflictPolicy === 'last_write_wins') {
      const failure = await this.attempt(item, false);
      if (failure === null) return this.succeed(item, result);
      if (failure.isNetworkError || failure.isUnauthorized) {
        result.offline = failure.isNetworkError;
        return 'stop';
      }
      if (!failure.isConflict) return this.fail(item, failure, result);
    }

    this.queue.update(item.id, { status: 'conflict', attempts: item.attempts + 1, lastError: 'Conflicto con la versión del servidor' });
    result.conflicts += 1;
    return 'continue';
  }

  private succeed(item: QueuedRequest, result: SyncResult): SendOutcome {
    this.queue.remove(item.id);
    result.synced += 1;
    return 'continue';
  }

  private fail(item: QueuedRequest, failure: ApiError, result: SyncResult): SendOutcome {
    const serverSide = failure.status >= 500;
    this.queue.update(item.id, {
      attempts: item.attempts + 1,
      lastError: failure.message,
      status: serverSide ? 'pending' : 'failed',
    });
    result.failed += 1;
    return serverSide ? 'stop' : 'continue';
  }

  private async attempt(item: QueuedRequest, withVersion: boolean): Promise<ApiError | null> {
    const headers: Record<string, string> = { 'Idempotency-Key': item.idempotencyKey };
    if (withVersion && item.ifVersion !== undefined) headers['If-Version'] = String(item.ifVersion);

    try {
      await ApiClient.request<unknown>({
        method: item.method,
        path: item.endpoint,
        token: this.options.getToken(),
        body: item.payload,
        headers,
      });
      return null;
    } catch (error) {
      if (error instanceof ApiError) return error;
      return new ApiError('No hay conexión con el servidor', 0, null);
    }
  }

  private compute(): SyncSnapshot {
    const pending = this.queue.count();
    const unresolved = this.queue.unresolved();
    const lastSyncAt = this.queue.lastSyncAt();
    let state: SyncState = 'synced';

    if (!this.options.isOnline()) state = 'offline';
    else if (this.syncing || pending > 0) state = 'pending';
    else if (unresolved > 0) state = 'error';

    return { state, pending, unresolved, syncing: this.syncing, lastSyncAt };
  }
}

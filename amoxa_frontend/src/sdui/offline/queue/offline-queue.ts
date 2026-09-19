import type { KeyValueStorage } from '@sdui-offline-storage/key-value-storage';
import type { QueuedRequest } from '@sdui-offline-queue/queued-request';

export type OfflineQueueListener = () => void;

interface PersistedQueue {
  items: QueuedRequest[];
  lastSyncAt?: string;
}

export class OfflineQueue {
  public static readonly STORAGE_KEY = 'amoxa-offline-queue';

  private readonly storage: KeyValueStorage;
  private readonly listeners = new Set<OfflineQueueListener>();
  private items: QueuedRequest[];
  private syncedAt: string | undefined;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
    const persisted = this.load();
    this.items = persisted.items;
    this.syncedAt = persisted.lastSyncAt;
  }

  public list(): readonly QueuedRequest[] {
    return this.items;
  }

  public pending(): readonly QueuedRequest[] {
    return this.items.filter((item) => item.status === 'pending');
  }

  public count(): number {
    return this.pending().length;
  }

  public unresolved(): number {
    return this.items.filter((item) => item.status !== 'pending').length;
  }

  public lastSyncAt(): string | undefined {
    return this.syncedAt;
  }

  public enqueue(item: QueuedRequest): void {
    this.items = [...this.items, item];
    this.commit();
  }

  public update(id: string, patch: Partial<QueuedRequest>): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item));
    this.commit();
  }

  public remove(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
    this.commit();
  }

  public markSynced(at: string): void {
    this.syncedAt = at;
    this.commit();
  }

  public clear(): void {
    this.items = [];
    this.commit();
  }

  public subscribe(listener: OfflineQueueListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commit(): void {
    this.persist();
    Array.from(this.listeners).forEach((listener) => listener());
  }

  private persist(): void {
    try {
      const payload: PersistedQueue = { items: this.items, lastSyncAt: this.syncedAt };
      this.storage.setItem(OfflineQueue.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      return;
    }
  }

  private load(): PersistedQueue {
    try {
      const raw = this.storage.getItem(OfflineQueue.STORAGE_KEY);
      if (raw === null) return { items: [] };
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return { items: [] };
      const record = parsed as Record<string, unknown>;
      const items = Array.isArray(record['items']) ? record['items'].filter((item) => this.isQueued(item)) : [];
      return {
        items,
        lastSyncAt: typeof record['lastSyncAt'] === 'string' ? record['lastSyncAt'] : undefined,
      };
    } catch {
      return { items: [] };
    }
  }

  private isQueued(value: unknown): value is QueuedRequest {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return (
      typeof record['id'] === 'string' &&
      typeof record['endpoint'] === 'string' &&
      typeof record['method'] === 'string' &&
      typeof record['status'] === 'string'
    );
  }
}

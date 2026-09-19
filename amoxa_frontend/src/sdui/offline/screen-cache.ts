import type { KeyValueStorage } from '@sdui-offline-storage/key-value-storage';

interface CachedScreen {
  fetchedAt: number;
  ttlSeconds: number;
  raw: unknown;
}

export class ScreenCache {
  private static readonly PREFIX = 'amoxa-sdui-screen:';
  private static readonly INDEX_KEY = 'amoxa-sdui-screen-index';

  private readonly storage: KeyValueStorage;
  private readonly now: () => number;

  constructor(storage: KeyValueStorage, now: () => number = () => Date.now()) {
    this.storage = storage;
    this.now = now;
  }

  public static key(scope: string, screenId: string, entityType?: string, entityId?: string): string {
    return `${ScreenCache.PREFIX}${scope}:${screenId}:${entityType ?? ''}:${entityId ?? ''}`;
  }

  public write(key: string, raw: unknown, ttlSeconds: number): void {
    const entry: CachedScreen = { fetchedAt: this.now(), ttlSeconds, raw };
    try {
      this.storage.setItem(key, JSON.stringify(entry));
      const index = this.readIndex();
      if (!index.includes(key)) this.storage.setItem(ScreenCache.INDEX_KEY, JSON.stringify([...index, key]));
    } catch {
      return;
    }
  }

  public read(key: string): unknown {
    try {
      const stored = this.storage.getItem(key);
      if (stored === null) return undefined;
      const entry = JSON.parse(stored) as Partial<CachedScreen>;
      if (typeof entry.fetchedAt !== 'number' || typeof entry.ttlSeconds !== 'number') return undefined;
      if (this.now() - entry.fetchedAt > entry.ttlSeconds * 1000) {
        this.storage.removeItem(key);
        return undefined;
      }
      return entry.raw;
    } catch {
      return undefined;
    }
  }

  public clear(): void {
    try {
      this.readIndex().forEach((key) => this.storage.removeItem(key));
      this.storage.removeItem(ScreenCache.INDEX_KEY);
    } catch {
      return;
    }
  }

  private readIndex(): string[] {
    const stored = this.storage.getItem(ScreenCache.INDEX_KEY);
    if (stored === null) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  }
}

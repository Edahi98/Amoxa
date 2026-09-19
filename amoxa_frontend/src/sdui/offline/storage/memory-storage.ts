import type { KeyValueStorage } from '@sdui-offline-storage/key-value-storage';

export class MemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  public removeItem(key: string): void {
    this.entries.delete(key);
  }
}

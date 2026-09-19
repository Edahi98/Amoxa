import type { KeyValueStorage } from '@sdui-offline-storage/key-value-storage';

export class BrowserStorage implements KeyValueStorage {
  public getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  public removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
  }
}

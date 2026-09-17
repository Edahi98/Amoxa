import type { AuthUser } from '@utils-auth/authUser.js';

export class TokenStorage {
  private static readonly STORAGE_KEY = 'amoxa-token';

  public static getStored(): string | null {
    try {
      return window.localStorage.getItem(TokenStorage.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  public static setStored(token: string): void {
    try {
      window.localStorage.setItem(TokenStorage.STORAGE_KEY, token);
    } catch {
      return;
    }
  }

  public static clear(): void {
    try {
      window.localStorage.removeItem(TokenStorage.STORAGE_KEY);
    } catch {
      return;
    }
  }

  public static isExpired(user: AuthUser | null): boolean {
    if (!user) return true;
    return user.exp * 1000 <= Date.now();
  }
}

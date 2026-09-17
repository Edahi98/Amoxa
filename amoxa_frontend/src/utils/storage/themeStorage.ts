export type Theme = 'light' | 'dark';

export class ThemeStorage {
  private static readonly STORAGE_KEY = 'amoxa-theme';

  public static getStored(): Theme | null {
    try {
      const stored = window.localStorage.getItem(ThemeStorage.STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }

  public static setStored(theme: Theme): void {
    try {
      window.localStorage.setItem(ThemeStorage.STORAGE_KEY, theme);
    } catch {
      return;
    }
  }

  public static getSystemPreference(): Theme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}

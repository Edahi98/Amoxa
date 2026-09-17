import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeStorage, type Theme } from '@utils-storage/themeStorage.js';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => ThemeStorage.getStored() ?? ThemeStorage.getSystemPreference());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => {
      if (ThemeStorage.getStored() === null) {
        setThemeState(event.matches ? 'dark' : 'light');
      }
    };
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    ThemeStorage.setStored(next);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

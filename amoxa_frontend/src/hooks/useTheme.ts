import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@contexts/ThemeContext.js';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}

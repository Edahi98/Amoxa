import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '@hooks/useTheme.js';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-pressed={isDark}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {isDark ? <Sun size={20} weight="regular" aria-hidden="true" /> : <Moon size={20} weight="regular" aria-hidden="true" />}
    </button>
  );
}

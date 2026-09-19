export type CssTokenMap = Record<string, string>;

export class ChartPalette {
  public static readonly SERIES_TOKENS: readonly string[] = [
    '--color-secondary',
    '--color-accent',
    '--color-success',
    '--color-info',
    '--color-warning',
    '--color-muted-foreground',
  ];

  public static readonly STRUCTURE_TOKENS: readonly string[] = [
    '--color-foreground',
    '--color-muted-foreground',
    '--color-border',
    '--color-card',
  ];

  public static readonly ALL_TOKENS: readonly string[] = [
    ...ChartPalette.SERIES_TOKENS,
    ...ChartPalette.STRUCTURE_TOKENS,
  ];

  private static readonly FALLBACK: CssTokenMap = {
    '--color-secondary': '#3b82f6',
    '--color-accent': '#ea580c',
    '--color-success': '#137a38',
    '--color-info': '#0369a1',
    '--color-warning': '#a84d08',
    '--color-muted-foreground': '#475569',
    '--color-foreground': '#1e293b',
    '--color-border': '#e2e8f0',
    '--color-card': '#ffffff',
  };

  private static readonly DASHES: readonly number[][] = [[], [8, 4], [2, 4], [10, 4, 2, 4], [4, 4], [14, 4]];

  private static readonly POINT_STYLES: readonly string[] = ['circle', 'rect', 'triangle', 'rectRot', 'star', 'cross'];

  public static token(tokens: CssTokenMap, name: string): string {
    const value = tokens[name];
    return value && value.length > 0 ? value : (ChartPalette.FALLBACK[name] ?? '#000000');
  }

  public static color(tokens: CssTokenMap, index: number): string {
    const names = ChartPalette.SERIES_TOKENS;
    return ChartPalette.token(tokens, names[index % names.length]);
  }

  public static dash(index: number): number[] {
    return [...ChartPalette.DASHES[index % ChartPalette.DASHES.length]];
  }

  public static pointStyle(index: number): string {
    return ChartPalette.POINT_STYLES[index % ChartPalette.POINT_STYLES.length];
  }

  public static withAlpha(color: string, alpha: number): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
    if (!match) {
      return color;
    }
    const value = parseInt(match[1], 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
}

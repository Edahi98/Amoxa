export class NumberFormatter {
  private static readonly LOCALE = 'es-MX';

  public static format(value: number, unit?: string): string {
    if (!Number.isFinite(value)) {
      return '—';
    }
    const text = new Intl.NumberFormat(NumberFormatter.LOCALE, { maximumFractionDigits: 2 }).format(value);
    return unit ? `${text} ${unit}` : text;
  }

  public static percent(value: number): string {
    const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
    return `${new Intl.NumberFormat(NumberFormatter.LOCALE, { maximumFractionDigits: 0 }).format(clamped)} %`;
  }

  public static coordinate(value: number): string {
    return new Intl.NumberFormat(NumberFormatter.LOCALE, {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    }).format(value);
  }
}

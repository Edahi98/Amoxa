export class ByteFormatter {
  private static readonly UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'];

  public static format(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return '0 B';
    }
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < ByteFormatter.UNITS.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const digits = unit === 0 || value >= 100 ? 0 : 1;
    const text = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
    return `${text} ${ByteFormatter.UNITS[unit]}`;
  }
}

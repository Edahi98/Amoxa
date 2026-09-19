export class DateFormatter {
  private static readonly LOCALE = 'es-MX';

  public static parseIso(iso: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!match) {
      return null;
    }
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  public static date(iso: string): string {
    const date = DateFormatter.parseIso(iso);
    if (!date) {
      return iso;
    }
    return new Intl.DateTimeFormat(DateFormatter.LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  public static dateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat(DateFormatter.LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  public static range(startIso?: string, endIso?: string): string {
    if (startIso && endIso) {
      return `${DateFormatter.date(startIso)} – ${DateFormatter.date(endIso)}`;
    }
    if (startIso) {
      return `Desde ${DateFormatter.date(startIso)}`;
    }
    if (endIso) {
      return `Hasta ${DateFormatter.date(endIso)}`;
    }
    return '';
  }
}

export interface GanttSpan {
  start: string;
  end: string;
}

export interface GanttRange {
  start: string;
  end: string;
  totalDays: number;
}

export interface GanttMonthColumn {
  key: string;
  label: string;
  leftPct: number;
  widthPct: number;
}

export interface GanttPosition {
  leftPct: number;
  widthPct: number;
}

export class GanttScale {
  private static readonly DAY_MS = 86_400_000;

  public static toUtc(iso: string): number {
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7)) - 1;
    const day = Number(iso.slice(8, 10));
    return Date.UTC(year, month, day);
  }

  public static toIso(time: number): string {
    const date = new Date(time);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}-${day}`;
  }

  public static isValid(iso: string): boolean {
    return /^\d{4}-\d{2}-\d{2}/.test(iso) && !Number.isNaN(GanttScale.toUtc(iso));
  }

  public static diffDays(startIso: string, endIso: string): number {
    return Math.round((GanttScale.toUtc(endIso) - GanttScale.toUtc(startIso)) / GanttScale.DAY_MS);
  }

  public static range(items: readonly GanttSpan[], rangeStart?: string, rangeEnd?: string): GanttRange | null {
    const valid = items.filter((item) => GanttScale.isValid(item.start) && GanttScale.isValid(item.end));
    const times = valid.flatMap((item) => [GanttScale.toUtc(item.start), GanttScale.toUtc(item.end)]);
    const explicitMin = rangeStart && GanttScale.isValid(rangeStart) ? GanttScale.toUtc(rangeStart) : null;
    const explicitMax = rangeEnd && GanttScale.isValid(rangeEnd) ? GanttScale.toUtc(rangeEnd) : null;
    const min = explicitMin ?? (times.length > 0 ? Math.min(...times) : null);
    const max = explicitMax ?? (times.length > 0 ? Math.max(...times) : null);
    if (min === null || max === null) {
      return null;
    }
    const first = new Date(min);
    const last = new Date(max);
    const startTime = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
    const endTime = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0);
    const start = GanttScale.toIso(startTime);
    const end = GanttScale.toIso(Math.max(startTime, endTime));
    return { start, end, totalDays: GanttScale.diffDays(start, end) + 1 };
  }

  public static months(range: GanttRange): GanttMonthColumn[] {
    const columns: GanttMonthColumn[] = [];
    const first = new Date(GanttScale.toUtc(range.start));
    const endTime = GanttScale.toUtc(range.end);
    let cursor = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
    while (cursor <= endTime) {
      const date = new Date(cursor);
      const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
      const days = Math.round((Math.min(nextMonth, endTime + GanttScale.DAY_MS) - cursor) / GanttScale.DAY_MS);
      const offset = Math.round((cursor - GanttScale.toUtc(range.start)) / GanttScale.DAY_MS);
      const label = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date);
      columns.push({
        key: GanttScale.toIso(cursor).slice(0, 7),
        label,
        leftPct: (offset / range.totalDays) * 100,
        widthPct: (days / range.totalDays) * 100,
      });
      cursor = nextMonth;
    }
    return columns;
  }

  public static position(span: GanttSpan, range: GanttRange): GanttPosition {
    const rangeStart = GanttScale.toUtc(range.start);
    const startDay = Math.round((Math.min(GanttScale.toUtc(span.start), GanttScale.toUtc(span.end)) - rangeStart) / GanttScale.DAY_MS);
    const endDay = Math.round((Math.max(GanttScale.toUtc(span.start), GanttScale.toUtc(span.end)) - rangeStart) / GanttScale.DAY_MS);
    const clampedStart = Math.min(Math.max(startDay, 0), range.totalDays - 1);
    const clampedEnd = Math.min(Math.max(endDay, 0), range.totalDays - 1);
    const leftPct = (clampedStart / range.totalDays) * 100;
    const widthPct = ((clampedEnd - clampedStart + 1) / range.totalDays) * 100;
    return { leftPct, widthPct };
  }

  public static clampProgress(progress?: number): number | null {
    if (progress === undefined || !Number.isFinite(progress)) {
      return null;
    }
    return Math.min(100, Math.max(0, Math.round(progress)));
  }
}

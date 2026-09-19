export interface CalendarCell {
  date: string;
  day: number;
  inMonth: boolean;
}

export interface DatedItem {
  date: string;
}

export class CalendarMath {
  private static readonly DAY_MS = 86_400_000;

  private static readonly WEEKDAYS: readonly string[] = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

  public static isValidMonth(month: string): boolean {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      return false;
    }
    const value = Number(match[2]);
    return value >= 1 && value <= 12;
  }

  public static pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  public static toIso(year: number, monthIndex: number, day: number): string {
    return `${year}-${CalendarMath.pad(monthIndex + 1)}-${CalendarMath.pad(day)}`;
  }

  public static todayIso(now: Date = new Date()): string {
    return CalendarMath.toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }

  public static currentMonth(now: Date = new Date()): string {
    return CalendarMath.todayIso(now).slice(0, 7);
  }

  public static monthOf(iso: string): string {
    return iso.slice(0, 7);
  }

  public static parts(month: string): { year: number; monthIndex: number } {
    const valid = CalendarMath.isValidMonth(month) ? month : CalendarMath.currentMonth();
    return { year: Number(valid.slice(0, 4)), monthIndex: Number(valid.slice(5, 7)) - 1 };
  }

  public static addMonths(month: string, delta: number): string {
    const { year, monthIndex } = CalendarMath.parts(month);
    const date = new Date(Date.UTC(year, monthIndex + delta, 1));
    return `${date.getUTCFullYear()}-${CalendarMath.pad(date.getUTCMonth() + 1)}`;
  }

  public static monthLabel(month: string): string {
    const { year, monthIndex } = CalendarMath.parts(month);
    const label = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(year, monthIndex, 1)),
    );
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  public static dayLabel(iso: string): string {
    const year = Number(iso.slice(0, 4));
    const monthIndex = Number(iso.slice(5, 7)) - 1;
    const day = Number(iso.slice(8, 10));
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, monthIndex, day)));
  }

  public static weekdays(): readonly string[] {
    return CalendarMath.WEEKDAYS;
  }

  public static daysInMonth(month: string): number {
    const { year, monthIndex } = CalendarMath.parts(month);
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  public static grid(month: string): CalendarCell[][] {
    const { year, monthIndex } = CalendarMath.parts(month);
    const first = Date.UTC(year, monthIndex, 1);
    const offset = (new Date(first).getUTCDay() + 6) % 7;
    const weekCount = Math.ceil((offset + CalendarMath.daysInMonth(month)) / 7);
    const start = first - offset * CalendarMath.DAY_MS;
    const weeks: CalendarCell[][] = [];
    for (let week = 0; week < weekCount; week += 1) {
      const row: CalendarCell[] = [];
      for (let column = 0; column < 7; column += 1) {
        const date = new Date(start + (week * 7 + column) * CalendarMath.DAY_MS);
        row.push({
          date: CalendarMath.toIso(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
          day: date.getUTCDate(),
          inMonth: date.getUTCMonth() === monthIndex,
        });
      }
      weeks.push(row);
    }
    return weeks;
  }

  public static groupByDate<T extends DatedItem>(items: readonly T[]): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const key = item.date.slice(0, 10);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        groups.set(key, [item]);
      }
    }
    return groups;
  }

  public static inMonth<T extends DatedItem>(items: readonly T[], month: string): T[] {
    return items
      .filter((item) => CalendarMath.monthOf(item.date) === month)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

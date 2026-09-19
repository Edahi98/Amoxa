export type SortDirection = 'asc' | 'desc';

export type TableRecord = Readonly<Record<string, unknown>>;

export class TableSorter {
  private static readonly COLLATOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

  public static next(current: SortDirection | null): SortDirection | null {
    if (current === null) return 'asc';
    return current === 'asc' ? 'desc' : null;
  }

  public static sort(rows: readonly TableRecord[], key: string, direction: SortDirection | null): TableRecord[] {
    if (direction === null) return [...rows];
    const sign = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const emptyLeft = TableSorter.isEmpty(left[key]);
      const emptyRight = TableSorter.isEmpty(right[key]);
      if (emptyLeft || emptyRight) return Number(emptyLeft) - Number(emptyRight);
      return sign * TableSorter.compare(left[key], right[key]);
    });
  }

  private static isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  private static compare(left: unknown, right: unknown): number {
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return TableSorter.COLLATOR.compare(String(left), String(right));
  }
}

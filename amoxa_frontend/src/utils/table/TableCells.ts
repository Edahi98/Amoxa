import { DateFormatter } from '@utils-format/DateFormatter.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';

export type TableCellKind = 'text' | 'badge' | 'date' | 'number';

export class TableCells {
  public static readonly KINDS: readonly TableCellKind[] = ['text', 'badge', 'date', 'number'];
  public static readonly EMPTY = '—';

  public static text(kind: TableCellKind, value: unknown): string {
    if (value === null || value === undefined || value === '') return TableCells.EMPTY;
    if (kind === 'number' && typeof value === 'number') return NumberFormatter.format(value);
    if (kind === 'date' && typeof value === 'string') return DateFormatter.parseIso(value) === null ? TableCells.EMPTY : DateFormatter.dateTime(value);
    return String(value);
  }

  public static isNumeric(kind: TableCellKind): boolean {
    return kind === 'number';
  }
}

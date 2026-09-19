import { useId, useMemo, useState } from 'react';
import { CaretDown, CaretUp, CaretUpDown } from '@phosphor-icons/react';
import { Badge, type BadgeTone } from '@atoms-display/Badge.js';
import { ClassNames } from '@utils-style/cn.js';
import { TableCells, type TableCellKind } from '@utils-table/TableCells.js';
import { TableSorter, type SortDirection, type TableRecord } from '@utils-table/TableSorter.js';

export interface DataTableColumn {
  key: string;
  label: string;
  kind: TableCellKind;
  sortable: boolean;
  tones: Readonly<Record<string, BadgeTone>>;
}

export interface DataTableProps {
  caption: string;
  columns: readonly DataTableColumn[];
  rows: readonly TableRecord[];
  emptyText?: string;
  onRowPress?: (rowId: string) => void;
  id?: string;
  className?: string;
}

export class DataTableModel {
  public static rowId(row: TableRecord, index: number): string {
    const raw = row['id'];
    return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : String(index);
  }

  public static ariaSort(active: boolean, direction: SortDirection | null): 'ascending' | 'descending' | 'none' {
    if (!active || direction === null) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  }
}

export function DataTable({ caption, columns, rows, emptyText = 'Sin elementos para mostrar.', onRowPress, id, className }: DataTableProps) {
  const generatedId = useId();
  const tableId = id ?? generatedId;
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection | null>(null);
  const sorted = useMemo(() => (sortKey === null ? [...rows] : TableSorter.sort(rows, sortKey, direction)), [rows, sortKey, direction]);
  const pressable = typeof onRowPress === 'function';

  const toggleSort = (key: string) => {
    const nextDirection = TableSorter.next(sortKey === key ? direction : null);
    setSortKey(nextDirection === null ? null : key);
    setDirection(nextDirection);
  };

  if (rows.length === 0) {
    return (
      <p id={tableId} className={ClassNames.merge('text-sm text-muted-foreground', className)}>
        {emptyText}
      </p>
    );
  }

  return (
    <div className={ClassNames.merge('min-w-0 overflow-x-auto rounded-xl border border-border bg-card', className)}>
      <table id={tableId} className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-muted/60">
          <tr>
            {columns.map((column) => {
              const active = sortKey === column.key;
              const SortIcon = !active || direction === null ? CaretUpDown : direction === 'asc' ? CaretUp : CaretDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? DataTableModel.ariaSort(active, direction) : undefined}
                  className={ClassNames.merge('px-4 py-3 font-semibold text-foreground', TableCells.isNumeric(column.kind) && 'text-right')}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="-mx-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 transition-colors duration-200 hover:bg-muted focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {column.label}
                      <SortIcon size={16} aria-hidden="true" className={active ? 'text-foreground' : 'text-muted-foreground'} />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row, rowIndex) => {
            const rowId = DataTableModel.rowId(row, rowIndex);
            return (
              <tr
                key={rowId}
                onClick={pressable ? () => onRowPress(rowId) : undefined}
                className={ClassNames.merge('transition-colors duration-200', pressable && 'cursor-pointer hover:bg-muted')}
              >
                {columns.map((column, columnIndex) => {
                  const value = row[column.key];
                  const text = TableCells.text(column.kind, value);
                  const cellClass = ClassNames.merge(
                    'px-4 py-3 align-middle text-foreground [overflow-wrap:anywhere]',
                    TableCells.isNumeric(column.kind) && 'text-right tabular-nums',
                  );
                  const content =
                    column.kind === 'badge' && text !== TableCells.EMPTY ? (
                      <Badge label={text} tone={column.tones[text] ?? 'neutral'} />
                    ) : (
                      text
                    );
                  return (
                    <td key={column.key} className={cellClass}>
                      {pressable && columnIndex === 0 ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRowPress(rowId);
                          }}
                          className="min-h-11 cursor-pointer text-left font-semibold underline-offset-2 hover:underline focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          {content}
                        </button>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

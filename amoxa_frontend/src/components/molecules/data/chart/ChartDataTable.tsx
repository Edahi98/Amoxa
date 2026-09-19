import { DatasetTable, type ChartSeries } from '@utils-chart/DatasetTable.js';

export interface ChartDataTableProps {
  caption: string;
  labels: string[];
  datasets: ChartSeries[];
  unit?: string;
}

export function ChartDataTable({ caption, labels, datasets, unit }: ChartDataTableProps) {
  const { headers, rows } = DatasetTable.build(labels, datasets, unit);

  return (
    <details className="group min-w-0 rounded-lg border border-border bg-card">
      <summary className="flex h-11 cursor-pointer items-center px-4 text-sm font-medium text-foreground focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2">
        Ver datos en tabla
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-max border-collapse text-sm tabular-nums">
          <caption className="px-4 py-2 text-left text-xs text-muted-foreground">{caption}</caption>
          <thead>
            <tr className="bg-muted text-left">
              {headers.map((header, index) => (
                <th key={`${header}-${index}`} scope="col" className="px-4 py-2 font-semibold text-foreground">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border">
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row" className="px-4 py-2 text-left font-medium text-foreground">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex} className="px-4 py-2 text-foreground">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

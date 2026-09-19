import { NumberFormatter } from '@utils-format/NumberFormatter.js';

export interface ChartSeries {
  label: string;
  data: number[];
}

export interface DatasetTableModel {
  headers: string[];
  rows: string[][];
}

export class DatasetTable {
  public static isEmpty(labels: readonly string[], datasets: readonly ChartSeries[]): boolean {
    if (labels.length === 0) {
      return true;
    }
    return !datasets.some((dataset) => dataset.data.some((value) => Number.isFinite(value)));
  }

  public static totalPoints(labels: readonly string[], datasets: readonly ChartSeries[]): number {
    return labels.length * datasets.length;
  }

  public static build(labels: readonly string[], datasets: readonly ChartSeries[], unit?: string): DatasetTableModel {
    const headers = ['Categoría', ...datasets.map((dataset) => (unit ? `${dataset.label} (${unit})` : dataset.label))];
    const rows = labels.map((label, index) => [
      label,
      ...datasets.map((dataset) => {
        const value = dataset.data[index];
        return value === undefined ? '—' : NumberFormatter.format(value);
      }),
    ]);
    return { headers, rows };
  }
}

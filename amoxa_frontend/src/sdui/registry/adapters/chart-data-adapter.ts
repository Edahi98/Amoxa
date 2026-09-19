import { PropReader } from '@sdui-registry-adapters/prop-reader';

export interface ChartSeriesShape {
  label: string;
  data: number[];
}

export interface ChartDataShape {
  labels: string[];
  datasets: ChartSeriesShape[];
}

export class ChartDataAdapter {
  public static resolve(bound: unknown, props: Readonly<Record<string, unknown>>): ChartDataShape {
    const seriesName = ChartDataAdapter.firstSeriesName(props);
    const fromBound = ChartDataAdapter.fromValue(bound, seriesName);
    if (fromBound) return fromBound;
    return ChartDataAdapter.fromValue({ labels: props['labels'], datasets: props['datasets'] }, seriesName) ?? { labels: [], datasets: [] };
  }

  private static fromValue(value: unknown, seriesName: string): ChartDataShape | undefined {
    if (Array.isArray(value)) return ChartDataAdapter.fromPoints(value, seriesName);
    if (!PropReader.isRecord(value)) return undefined;

    if (Array.isArray(value['labels']) && Array.isArray(value['datasets'])) {
      const labels = value['labels'].map((label) => String(label));
      const datasets = value['datasets'].flatMap((entry): ChartSeriesShape[] => {
        if (!PropReader.isRecord(entry) || !Array.isArray(entry['data'])) return [];
        const label = typeof entry['label'] === 'string' ? entry['label'] : seriesName;
        return [{ label, data: entry['data'].map((item) => ChartDataAdapter.toNumber(item)) }];
      });
      return { labels, datasets };
    }

    if (Array.isArray(value['labels']) && Array.isArray(value['data'])) {
      const labels = value['labels'].map((label) => String(label));
      return { labels, datasets: [{ label: seriesName, data: value['data'].map((item) => ChartDataAdapter.toNumber(item)) }] };
    }

    const entries = Object.entries(value).filter(([, item]) => typeof item === 'number');
    if (entries.length === 0) return undefined;
    return {
      labels: entries.map(([label]) => label),
      datasets: [{ label: seriesName, data: entries.map(([, item]) => ChartDataAdapter.toNumber(item)) }],
    };
  }

  private static fromPoints(points: readonly unknown[], seriesName: string): ChartDataShape | undefined {
    const rows = points.flatMap((point): Array<[string, number]> => {
      if (!PropReader.isRecord(point)) return [];
      const label = point['label'] ?? point['name'] ?? point['nombre'] ?? point['area'];
      const amount = point['value'] ?? point['total'] ?? point['count'] ?? point['cantidad'];
      return label === undefined ? [] : [[String(label), ChartDataAdapter.toNumber(amount)]];
    });
    if (rows.length === 0) return undefined;
    return {
      labels: rows.map(([label]) => label),
      datasets: [{ label: seriesName, data: rows.map(([, amount]) => amount) }],
    };
  }

  private static firstSeriesName(props: Readonly<Record<string, unknown>>): string {
    const first = PropReader.array(props, 'datasets')[0];
    if (PropReader.isRecord(first) && typeof first['label'] === 'string') return first['label'];
    return 'Valor';
  }

  private static toNumber(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

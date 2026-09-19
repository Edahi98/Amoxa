import type { ChartData, ChartOptions } from 'chart.js';
import { ChartKind, type ChartKindName } from '@utils-chart/ChartKind.js';
import { ChartPalette, type CssTokenMap } from '@utils-chart/ChartPalette.js';
import type { ChartSeries } from '@utils-chart/DatasetTable.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';

export interface ChartOptionsInput {
  kind: ChartKindName;
  tokens: CssTokenMap;
  labels: readonly string[];
  unit?: string;
  stacked?: boolean;
  reducedMotion: boolean;
}

export class ChartConfigBuilder {
  public static readonly FONT_FAMILY = "'Plus Jakarta Sans', system-ui, 'Segoe UI', sans-serif";

  public static data(
    kind: ChartKindName,
    labels: readonly string[],
    datasets: readonly ChartSeries[],
    tokens: CssTokenMap,
    unit?: string,
  ): ChartData<'bar'> {
    if (ChartKind.isRound(kind)) {
      const source = datasets[0];
      const values = source ? source.data : [];
      return {
        labels: labels.map((label, index) => {
          const value = values[index];
          return value === undefined ? label : `${label} · ${NumberFormatter.format(value, unit)}`;
        }),
        datasets: [
          {
            label: source ? source.label : '',
            data: values,
            backgroundColor: labels.map((_, index) => ChartPalette.color(tokens, index)),
            borderColor: ChartPalette.token(tokens, '--color-card'),
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      } as unknown as ChartData<'bar'>;
    }

    return {
      labels: [...labels],
      datasets: datasets.map((dataset, index) => {
        const color = ChartPalette.color(tokens, index);
        if (kind === 'bar') {
          return {
            label: dataset.label,
            data: dataset.data,
            backgroundColor: ChartPalette.withAlpha(color, 0.85),
            borderColor: color,
            borderWidth: 1,
            borderRadius: 4,
          };
        }
        return {
          label: dataset.label,
          data: dataset.data,
          borderColor: color,
          backgroundColor: ChartPalette.withAlpha(color, 0.16),
          pointBackgroundColor: color,
          pointBorderColor: color,
          borderDash: ChartPalette.dash(index),
          pointStyle: ChartPalette.pointStyle(index),
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          tension: kind === 'line' ? 0.3 : 0,
          fill: kind === 'radar',
        };
      }),
    } as unknown as ChartData<'bar'>;
  }

  public static options(input: ChartOptionsInput): ChartOptions<'bar'> {
    const { kind, tokens, unit, stacked, reducedMotion, labels } = input;
    const foreground = ChartPalette.token(tokens, '--color-foreground');
    const muted = ChartPalette.token(tokens, '--color-muted-foreground');
    const border = ChartPalette.token(tokens, '--color-border');
    const card = ChartPalette.token(tokens, '--color-card');
    const gridColor = ChartPalette.withAlpha(border, 0.8);
    const font = { family: ChartConfigBuilder.FONT_FAMILY, size: 12 };
    const round = ChartKind.isRound(kind);

    const base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 300 },
      interaction: round ? { mode: 'nearest', intersect: true } : { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: foreground, usePointStyle: true, padding: 16, boxWidth: 10, boxHeight: 10, font },
        },
        tooltip: {
          backgroundColor: card,
          titleColor: foreground,
          bodyColor: foreground,
          borderColor: border,
          borderWidth: 1,
          padding: 10,
          titleFont: { ...font, weight: 600 },
          bodyFont: font,
          callbacks: {
            title: (items: Array<{ dataIndex: number }>) => (items[0] ? (labels[items[0].dataIndex] ?? '') : ''),
            label: (item: { dataset: { label?: string }; parsed: unknown; raw: unknown }) => {
              const raw = typeof item.raw === 'number' ? item.raw : Number(item.parsed);
              const prefix = round ? '' : `${item.dataset.label ?? ''}: `;
              return `${prefix}${NumberFormatter.format(raw, unit)}`;
            },
          },
        },
      },
    };

    if (round) {
      return { ...base, cutout: kind === 'doughnut' ? '62%' : 0 } as unknown as ChartOptions<'bar'>;
    }

    if (kind === 'radar') {
      return {
        ...base,
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: { color: foreground, font },
            ticks: {
              color: muted,
              backdropColor: 'transparent',
              font,
              callback: (value: string | number) => NumberFormatter.format(Number(value)),
            },
          },
        },
      } as unknown as ChartOptions<'bar'>;
    }

    return {
      ...base,
      scales: {
        x: {
          stacked: Boolean(stacked),
          grid: { display: false },
          border: { color: border },
          ticks: { color: muted, font },
        },
        y: {
          stacked: Boolean(stacked),
          beginAtZero: true,
          grid: { color: gridColor },
          border: { display: false },
          ticks: { color: muted, font, callback: (value: string | number) => NumberFormatter.format(Number(value)) },
          title: { display: Boolean(unit), text: unit ?? '', color: muted, font },
        },
      },
    } as unknown as ChartOptions<'bar'>;
  }
}

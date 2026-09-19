import type { Chart as ChartInstance, Plugin } from 'chart.js';

export class ChartPlugins {
  public static valueLabels(color: string, fontFamily: string, format: (value: number) => string): Plugin {
    return {
      id: 'amoxaValueLabels',
      afterDatasetsDraw(chart: ChartInstance) {
        const context = chart.ctx;
        context.save();
        context.fillStyle = color;
        context.font = `600 12px ${fontFamily}`;
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          if (!chart.isDatasetVisible(datasetIndex)) {
            return;
          }
          const meta = chart.getDatasetMeta(datasetIndex);
          meta.data.forEach((element, index) => {
            const raw = dataset.data[index];
            if (typeof raw !== 'number' || !Number.isFinite(raw)) {
              return;
            }
            const position = element.tooltipPosition(false);
            if (position.x === null || position.y === null) {
              return;
            }
            context.fillText(format(raw), position.x, position.y - 8);
          });
        });
        context.restore();
      },
    };
  }
}

import { useMemo, useId } from 'react';
import { Chart as ChartCanvas } from 'react-chartjs-2';
import { ChartDataTable } from '@molecules-data-chart/ChartDataTable.js';
import { EmptyState } from '@molecules-feedback/EmptyState.js';
import { useCssTokens } from '@hooks/useCssTokens.js';
import { usePrefersReducedMotion } from '@hooks/usePrefersReducedMotion.js';
import { ChartConfigBuilder } from '@utils-chart/ChartConfigBuilder.js';
import { ChartKind, type ChartKindName } from '@utils-chart/ChartKind.js';
import { ChartPalette } from '@utils-chart/ChartPalette.js';
import { ChartPlugins } from '@utils-chart/ChartPlugins.js';
import { ChartRegistry } from '@utils-chart/ChartRegistry.js';
import { DatasetTable, type ChartSeries } from '@utils-chart/DatasetTable.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';
import { ClassNames } from '@utils-style/cn.js';

ChartRegistry.ensure();

export type ChartDataset = ChartSeries;

export interface ChartProps {
  kind: ChartKindName;
  labels: string[];
  datasets: ChartDataset[];
  title?: string;
  ariaLabel: string;
  stacked?: boolean;
  unit?: string;
  height?: number;
  id?: string;
  className?: string;
}

export function Chart({ kind, labels, datasets, title, ariaLabel, stacked, unit, height = 288, id, className }: ChartProps) {
  const generatedId = useId();
  const chartId = id ?? generatedId;
  const tokens = useCssTokens(ChartPalette.ALL_TOKENS);
  const reducedMotion = usePrefersReducedMotion();
  const resolvedKind = ChartKind.resolve(kind, labels.length);
  const empty = DatasetTable.isEmpty(labels, datasets);
  const showValues =
    !ChartKind.isRound(resolvedKind) &&
    !stacked &&
    DatasetTable.totalPoints(labels, datasets) <= ChartKind.MAX_DIRECT_LABELS;

  const data = useMemo(
    () => ChartConfigBuilder.data(resolvedKind, labels, datasets, tokens, unit),
    [resolvedKind, labels, datasets, tokens, unit],
  );
  const options = useMemo(
    () => ChartConfigBuilder.options({ kind: resolvedKind, tokens, labels, unit, stacked, reducedMotion }),
    [resolvedKind, tokens, labels, unit, stacked, reducedMotion],
  );
  const plugins = useMemo(
    () =>
      showValues
        ? [
            ChartPlugins.valueLabels(ChartPalette.token(tokens, '--color-foreground'), ChartConfigBuilder.FONT_FAMILY, (value) =>
              NumberFormatter.format(value, unit),
            ),
          ]
        : [],
    [showValues, tokens, unit],
  );

  return (
    <figure id={id} className={ClassNames.merge('flex min-w-0 flex-col gap-3', className)}>
      {title ? (
        <figcaption id={`${chartId}-title`} className="text-lg font-semibold text-foreground text-balance">
          {title}
        </figcaption>
      ) : null}
      {empty ? (
        <EmptyState title="Sin datos" description="Todavía no hay valores para graficar." />
      ) : (
        <>
          <div className="relative w-full min-w-0" style={{ height }}>
            <ChartCanvas
              type={resolvedKind as 'bar'}
              data={data}
              options={options}
              plugins={plugins}
              role="img"
              aria-label={ariaLabel}
            />
          </div>
          <ChartDataTable caption={title ?? ariaLabel} labels={labels} datasets={datasets} unit={unit} />
        </>
      )}
    </figure>
  );
}

import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@molecules-data/DataTable.js';
import { Chart } from '@molecules-data-chart/Chart.js';
import { GanttChart, type GanttItem } from '@molecules-schedule/GanttChart.js';
import { ProgramCalendar, type CalendarEvent } from '@molecules-schedule/ProgramCalendar.js';
import { TableCells } from '@utils-table/TableCells.js';
import { ToneStyles } from '@utils-style/ToneStyles.js';
import { PropReader } from '@sdui-registry-adapters/prop-reader';
import { RecordNormalizer } from '@sdui-registry-adapters/record-normalizer';
import { ChartDataAdapter } from '@sdui-registry-adapters/chart-data-adapter';
import type { RenderContext } from '@sdui-registry/render-context';
import type { ChartKindName } from '@utils-chart/ChartKind.js';

export class DataMappers {
  private static readonly CHART_KINDS: readonly ChartKindName[] = ['bar', 'line', 'doughnut', 'pie', 'radar'];

  public static chart(ctx: RenderContext): ReactNode {
    const data = ChartDataAdapter.resolve(ctx.value, ctx.props);
    const title = PropReader.string(ctx.props, 'title');
    return (
      <Chart
        id={ctx.node.id}
        kind={PropReader.oneOf(ctx.props, 'kind', DataMappers.CHART_KINDS) ?? 'bar'}
        labels={data.labels}
        datasets={data.datasets}
        title={title}
        ariaLabel={PropReader.string(ctx.props, 'ariaLabel') ?? title ?? 'Gráfica'}
        stacked={PropReader.boolean(ctx.props, 'stacked')}
        unit={PropReader.string(ctx.props, 'unit')}
        height={PropReader.number(ctx.props, 'height')}
      />
    );
  }

  public static programCalendar(ctx: RenderContext): ReactNode {
    const record = PropReader.isRecord(ctx.value) ? RecordNormalizer.record(ctx.value) : undefined;
    const source = Array.isArray(ctx.value) ? ctx.value : (record?.['events'] ?? ctx.props['events']);
    const events = DataMappers.entries(source).flatMap((entry, index): CalendarEvent[] => {
      const date = PropReader.string(entry, 'date');
      const title = PropReader.string(entry, 'title');
      if (date === undefined || title === undefined) return [];
      return [
        {
          id: PropReader.scalarText(entry['id']) ?? String(index),
          date,
          title,
          tone: PropReader.oneOf(entry, 'tone', ToneStyles.TONES),
          status: PropReader.string(entry, 'status'),
        },
      ];
    });
    const month = PropReader.string(record, 'month') ?? PropReader.string(ctx.props, 'month');

    return (
      <ProgramCalendar
        id={ctx.node.id}
        month={month}
        events={events}
        onEventPress={ctx.hasPress() ? (eventId) => ctx.press({ eventId }) : undefined}
        onMonthChange={record ? (next) => ctx.setValue({ ...ctx.value as Record<string, unknown>, month: next }) : undefined}
      />
    );
  }

  public static gantt(ctx: RenderContext): ReactNode {
    const record = PropReader.isRecord(ctx.value) ? RecordNormalizer.record(ctx.value) : undefined;
    const source = Array.isArray(ctx.value) ? ctx.value : (record?.['items'] ?? ctx.props['items']);
    const items = DataMappers.entries(source).flatMap((entry, index): GanttItem[] => {
      const start = PropReader.string(entry, 'start');
      const end = PropReader.string(entry, 'end');
      const label = PropReader.string(entry, 'label') ?? PropReader.string(entry, 'title');
      if (start === undefined || end === undefined || label === undefined) return [];
      return [
        {
          id: PropReader.scalarText(entry['id']) ?? String(index),
          label,
          start,
          end,
          progress: PropReader.number(entry, 'progress'),
          tone: PropReader.oneOf(entry, 'tone', ToneStyles.TONES),
        },
      ];
    });

    return (
      <GanttChart
        id={ctx.node.id}
        items={items}
        rangeStart={PropReader.string(record, 'rangeStart') ?? PropReader.string(ctx.props, 'rangeStart')}
        rangeEnd={PropReader.string(record, 'rangeEnd') ?? PropReader.string(ctx.props, 'rangeEnd')}
        onItemPress={ctx.hasPress() ? (itemId) => ctx.press({ itemId }) : undefined}
      />
    );
  }

  public static table(ctx: RenderContext): ReactNode {
    return (
      <DataTable
        id={ctx.node.id}
        caption={PropReader.string(ctx.props, 'caption') ?? ctx.node.id}
        columns={DataMappers.tableColumns(ctx)}
        rows={DataMappers.entries(ctx.value)}
        emptyText={PropReader.string(ctx.props, 'emptyText')}
        onRowPress={ctx.hasPress() ? (rowId) => ctx.press({ itemId: rowId }) : undefined}
      />
    );
  }

  private static tableColumns(ctx: RenderContext): DataTableColumn[] {
    return PropReader.array(ctx.props, 'columns').flatMap((entry): DataTableColumn[] => {
      if (!PropReader.isRecord(entry)) return [];
      const key = PropReader.string(entry, 'key');
      const label = PropReader.string(entry, 'label');
      if (key === undefined || label === undefined) return [];
      const source = PropReader.isRecord(entry['tones']) ? entry['tones'] : {};
      const tones = Object.fromEntries(
        Object.entries(source).flatMap(([value, tone]) => {
          const narrowed = PropReader.narrow(tone, ToneStyles.TONES);
          return narrowed === undefined ? [] : [[value, narrowed]];
        }),
      );
      return [{ key, label, kind: PropReader.narrow(entry['kind'], TableCells.KINDS) ?? 'text', sortable: entry['sortable'] === true, tones }];
    });
  }

  private static entries(source: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(source)) return [];
    return source.filter((entry) => PropReader.isRecord(entry)).map((entry) => RecordNormalizer.record(entry));
  }
}

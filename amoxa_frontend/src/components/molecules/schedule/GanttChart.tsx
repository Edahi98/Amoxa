import { EmptyState } from '@molecules-feedback/EmptyState.js';
import { Card } from '@molecules-layout/Card.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';
import { GanttScale } from '@utils-schedule/GanttScale.js';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export interface GanttItem {
  id: string;
  label: string;
  start: string;
  end: string;
  progress?: number;
  tone?: Tone;
}

export interface GanttChartProps {
  items: GanttItem[];
  rangeStart?: string;
  rangeEnd?: string;
  onItemPress?: (id: string) => void;
  id?: string;
  className?: string;
}

export function GanttChart({ items, rangeStart, rangeEnd, onItemPress, id, className }: GanttChartProps) {
  const validItems = items.filter((item) => GanttScale.isValid(item.start) && GanttScale.isValid(item.end));
  const range = GanttScale.range(validItems, rangeStart, rangeEnd);

  if (!range || validItems.length === 0) {
    return (
      <EmptyState
        id={id}
        className={className}
        title="Sin actividades programadas"
        description="Cuando existan actividades con fechas, aparecerán en la línea de tiempo."
      />
    );
  }

  const months = GanttScale.months(range);

  return (
    <Card tone="glass" id={id} className={ClassNames.merge('gap-3 p-3 sm:p-5', className)}>
      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-[minmax(7rem,12rem)_minmax(0,1fr)] border-b border-border">
            <div className="py-2 pr-3 text-xs font-semibold text-muted-foreground">Actividad</div>
            <div className="relative h-8" aria-hidden="true">
              {months.map((column) => (
                <span
                  key={column.key}
                  className="absolute inset-y-0 flex items-center border-l border-border pl-2 text-xs font-semibold capitalize text-muted-foreground"
                  style={{ left: `${column.leftPct}%`, width: `${column.widthPct}%` }}
                >
                  {column.label}
                </span>
              ))}
            </div>
          </div>
          <ul className="m-0 list-none p-0">
            {validItems.map((item) => {
              const position = GanttScale.position(item, range);
              const progress = GanttScale.clampProgress(item.progress);
              const tone = item.tone ?? 'primary';
              const summary = `${item.label}, del ${DateFormatter.date(item.start)} al ${DateFormatter.date(item.end)}${
                progress !== null ? `, avance ${progress} %` : ''
              }`;
              const barClasses = ClassNames.merge(
                'absolute top-1.5 flex h-8 min-w-6 items-center overflow-hidden rounded-md px-2 text-xs font-semibold tabular-nums',
                ToneStyles.soft(tone),
                onItemPress && 'cursor-pointer transition-colors duration-200 hover:brightness-95',
              );
              const barStyle = { left: `${position.leftPct}%`, width: `${position.widthPct}%` };
              const content = (
                <>
                  <span className="min-w-0 truncate">{progress !== null ? `${progress} %` : item.label}</span>
                  {progress !== null ? (
                    <span
                      aria-hidden="true"
                      className={ClassNames.merge('absolute inset-x-0 bottom-0 h-1.5 origin-left', ToneStyles.solid(tone))}
                      style={{ transform: `scaleX(${progress / 100})` }}
                    />
                  ) : null}
                </>
              );
              return (
                <li key={item.id} className="grid grid-cols-[minmax(7rem,12rem)_minmax(0,1fr)] border-b border-border last:border-b-0">
                  <div className="flex min-w-0 items-center py-2 pr-3 text-sm font-medium text-foreground">
                    <span className="min-w-0 break-words">{item.label}</span>
                  </div>
                  <div className="relative h-11">
                    {months.map((column) => (
                      <span
                        key={column.key}
                        aria-hidden="true"
                        className="absolute inset-y-0 border-l border-border/60"
                        style={{ left: `${column.leftPct}%` }}
                      />
                    ))}
                    {onItemPress ? (
                      <button type="button" aria-label={summary} onClick={() => onItemPress(item.id)} className={barClasses} style={barStyle}>
                        {content}
                      </button>
                    ) : (
                      <div role="img" aria-label={summary} className={barClasses} style={barStyle}>
                        {content}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <details className="min-w-0 rounded-lg border border-border bg-card">
        <summary className="flex h-11 cursor-pointer items-center px-4 text-sm font-medium text-foreground">
          Ver datos en tabla
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-max border-collapse text-sm tabular-nums">
            <caption className="px-4 py-2 text-left text-xs text-muted-foreground">Actividades programadas</caption>
            <thead>
              <tr className="bg-muted text-left">
                <th scope="col" className="px-4 py-2 font-semibold text-foreground">Actividad</th>
                <th scope="col" className="px-4 py-2 font-semibold text-foreground">Inicio</th>
                <th scope="col" className="px-4 py-2 font-semibold text-foreground">Fin</th>
                <th scope="col" className="px-4 py-2 font-semibold text-foreground">Avance</th>
              </tr>
            </thead>
            <tbody>
              {validItems.map((item) => {
                const progress = GanttScale.clampProgress(item.progress);
                return (
                  <tr key={item.id} className="border-t border-border">
                    <th scope="row" className="px-4 py-2 text-left font-medium text-foreground">{item.label}</th>
                    <td className="px-4 py-2 text-foreground">{DateFormatter.date(item.start)}</td>
                    <td className="px-4 py-2 text-foreground">{DateFormatter.date(item.end)}</td>
                    <td className="px-4 py-2 text-foreground">{progress !== null ? NumberFormatter.percent(progress) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

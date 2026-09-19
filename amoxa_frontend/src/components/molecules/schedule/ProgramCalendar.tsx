import { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Card } from '@molecules-layout/Card.js';
import { useControllableState } from '@hooks/useControllableState.js';
import { CalendarMath } from '@utils-schedule/CalendarMath.js';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  tone?: Tone;
  status?: string;
}

export interface ProgramCalendarProps {
  month?: string;
  events: CalendarEvent[];
  onEventPress?: (id: string) => void;
  onMonthChange?: (month: string) => void;
  id?: string;
  className?: string;
}

export class CalendarView {
  public static readonly MAX_VISIBLE = 2;

  public static eventLabel(event: CalendarEvent): string {
    return event.status ? `${event.title}, ${event.status}` : event.title;
  }
}

export function ProgramCalendar({ month, events, onEventPress, onMonthChange, id, className }: ProgramCalendarProps) {
  const [currentMonth, setCurrentMonth] = useControllableState<string>(month, CalendarMath.currentMonth(), onMonthChange);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const safeMonth = CalendarMath.isValidMonth(currentMonth) ? currentMonth : CalendarMath.currentMonth();
  const weeks = CalendarMath.grid(safeMonth);
  const grouped = CalendarMath.groupByDate(events);
  const monthEvents = CalendarMath.inMonth(events, safeMonth);
  const today = CalendarMath.todayIso();
  const label = CalendarMath.monthLabel(safeMonth);

  const changeMonth = (delta: number) => {
    setExpandedDay(null);
    setCurrentMonth(CalendarMath.addMonths(safeMonth, delta));
  };

  const renderEvent = (event: CalendarEvent) => {
    const classes = ClassNames.merge(
      'block w-full min-w-0 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium',
      ToneStyles.soft(event.tone ?? 'primary'),
      onEventPress && 'cursor-pointer transition-colors duration-200 hover:brightness-95',
    );
    return onEventPress ? (
      <button
        key={event.id}
        type="button"
        title={CalendarView.eventLabel(event)}
        onClick={() => onEventPress(event.id)}
        className={classes}
      >
        {event.title}
      </button>
    ) : (
      <span key={event.id} title={CalendarView.eventLabel(event)} className={classes}>
        {event.title}
      </span>
    );
  };

  return (
    <Card tone="glass" id={id} className={ClassNames.merge('gap-3 p-3 sm:p-5', className)}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => changeMonth(-1)}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-200 hover:bg-muted"
        >
          <CaretLeft size={20} aria-hidden="true" />
        </button>
        <h3 aria-live="polite" className="min-w-0 truncate text-lg font-semibold text-foreground">
          {label}
        </h3>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => changeMonth(1)}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-200 hover:bg-muted"
        >
          <CaretRight size={20} aria-hidden="true" />
        </button>
      </div>
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Calendario de {label}</caption>
        <thead>
          <tr>
            {CalendarMath.weekdays().map((weekday) => (
              <th key={weekday} scope="col" className="pb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].date}>
              {week.map((cell) => {
                const dayEvents = grouped.get(cell.date) ?? [];
                const expanded = expandedDay === cell.date;
                const shown = expanded ? dayEvents : dayEvents.slice(0, CalendarView.MAX_VISIBLE);
                const hidden = dayEvents.length - CalendarView.MAX_VISIBLE;
                const isToday = cell.date === today;
                return (
                  <td
                    key={cell.date}
                    className={ClassNames.merge(
                      'h-20 min-w-0 border border-border p-1 align-top sm:h-24',
                      cell.inMonth ? 'bg-card/60' : 'bg-muted/40',
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span
                        aria-current={isToday ? 'date' : undefined}
                        className={ClassNames.merge(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                          isToday ? 'bg-primary text-on-primary' : cell.inMonth ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <span className="sr-only">{CalendarMath.dayLabel(cell.date)}: </span>
                        <span aria-hidden="true">{cell.day}</span>
                      </span>
                      {shown.map((event) => renderEvent(event))}
                      {hidden > 0 ? (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedDay(expanded ? null : cell.date)}
                          className="min-h-6 w-full cursor-pointer rounded px-1 text-left text-xs font-semibold text-on-primary-muted underline-offset-2 hover:underline"
                        >
                          {expanded ? 'Ver menos' : `+${hidden} más`}
                        </button>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <details className="min-w-0 rounded-lg border border-border bg-card">
        <summary className="flex h-11 cursor-pointer items-center px-4 text-sm font-medium text-foreground">
          Ver eventos del mes en lista ({monthEvents.length})
        </summary>
        {monthEvents.length === 0 ? (
          <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Sin eventos en {label}.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-border border-t border-border p-0">
            {monthEvents.map((event) => (
              <li key={event.id} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-sm">
                <span className="shrink-0 font-medium capitalize text-foreground tabular-nums">{CalendarMath.dayLabel(event.date.slice(0, 10))}</span>
                <span className="min-w-0 text-foreground">{event.title}</span>
                {event.status ? <span className="text-xs text-muted-foreground">{event.status}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </details>
    </Card>
  );
}

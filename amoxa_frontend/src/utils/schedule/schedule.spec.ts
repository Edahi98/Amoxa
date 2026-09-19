import { CalendarMath } from '@utils-schedule/CalendarMath.js';
import { GanttScale } from '@utils-schedule/GanttScale.js';

describe('CalendarMath', () => {
  it('valida y normaliza meses', () => {
    expect(CalendarMath.isValidMonth('2026-09')).toBe(true);
    expect(CalendarMath.isValidMonth('2026-13')).toBe(false);
    expect(CalendarMath.isValidMonth('26-9')).toBe(false);
    expect(CalendarMath.monthOf('2026-09-18')).toBe('2026-09');
    expect(CalendarMath.todayIso(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(CalendarMath.currentMonth(new Date(2026, 0, 31))).toBe('2026-01');
  });

  it('suma meses cruzando año', () => {
    expect(CalendarMath.addMonths('2026-12', 1)).toBe('2027-01');
    expect(CalendarMath.addMonths('2026-01', -1)).toBe('2025-12');
    expect(CalendarMath.addMonths('2026-03', 0)).toBe('2026-03');
  });

  it('etiqueta el mes en español con mayúscula inicial', () => {
    expect(CalendarMath.monthLabel('2026-09')).toBe('Septiembre de 2026');
  });

  it('calcula días del mes incluyendo bisiestos', () => {
    expect(CalendarMath.daysInMonth('2024-02')).toBe(29);
    expect(CalendarMath.daysInMonth('2026-02')).toBe(28);
    expect(CalendarMath.daysInMonth('2026-09')).toBe(30);
  });

  it('construye la cuadrícula con semana que inicia en lunes', () => {
    const grid = CalendarMath.grid('2026-09');
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0][0].date).toBe('2026-08-31');
    expect(grid[0][1].date).toBe('2026-09-01');
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid[grid.length - 1][6].date).toBe('2026-10-04');
    const inMonth = grid.flat().filter((cell) => cell.inMonth);
    expect(inMonth).toHaveLength(30);
  });

  it('febrero que empieza en lunes usa 4 semanas', () => {
    const grid = CalendarMath.grid('2027-02');
    expect(grid).toHaveLength(4);
    expect(grid[0][0].date).toBe('2027-02-01');
  });

  it('agrupa y filtra eventos por fecha y mes', () => {
    const events = [
      { date: '2026-09-10', id: 'a' },
      { date: '2026-09-10', id: 'b' },
      { date: '2026-10-01', id: 'c' },
    ];
    const grouped = CalendarMath.groupByDate(events);
    expect(grouped.get('2026-09-10')).toHaveLength(2);
    expect(CalendarMath.inMonth(events, '2026-09')).toHaveLength(2);
    expect(CalendarMath.inMonth(events, '2026-11')).toHaveLength(0);
  });

  it('expone los días de la semana de lunes a domingo', () => {
    expect(CalendarMath.weekdays()[0]).toBe('lun');
    expect(CalendarMath.weekdays()[6]).toBe('dom');
  });
});

describe('GanttScale', () => {
  it('calcula diferencias en días', () => {
    expect(GanttScale.diffDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(GanttScale.isValid('2026-01-01')).toBe(true);
    expect(GanttScale.isValid('nope')).toBe(false);
  });

  it('deriva el rango a límites de mes desde los ítems', () => {
    const range = GanttScale.range([
      { start: '2026-01-15', end: '2026-02-10' },
      { start: '2026-03-05', end: '2026-03-20' },
    ]);
    expect(range?.start).toBe('2026-01-01');
    expect(range?.end).toBe('2026-03-31');
    expect(range?.totalDays).toBe(90);
  });

  it('respeta rango explícito y devuelve null sin datos', () => {
    const range = GanttScale.range([{ start: '2026-06-01', end: '2026-06-10' }], '2026-01-01', '2026-12-31');
    expect(range?.start).toBe('2026-01-01');
    expect(range?.end).toBe('2026-12-31');
    expect(GanttScale.range([])).toBeNull();
  });

  it('genera columnas mensuales que suman 100 por ciento', () => {
    const range = GanttScale.range([{ start: '2026-01-01', end: '2026-03-31' }]);
    if (!range) {
      throw new Error('rango nulo');
    }
    const months = GanttScale.months(range);
    expect(months.map((month) => month.key)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(months[0].leftPct).toBe(0);
    const total = months.reduce((sum, month) => sum + month.widthPct, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('posiciona barras por porcentaje y las limita al rango', () => {
    const range = GanttScale.range([{ start: '2026-01-01', end: '2026-01-31' }]);
    if (!range) {
      throw new Error('rango nulo');
    }
    const full = GanttScale.position({ start: '2026-01-01', end: '2026-01-31' }, range);
    expect(full.leftPct).toBe(0);
    expect(full.widthPct).toBeCloseTo(100, 5);
    const half = GanttScale.position({ start: '2026-01-16', end: '2026-01-31' }, range);
    expect(half.leftPct).toBeCloseTo((15 / 31) * 100, 5);
    const outside = GanttScale.position({ start: '2025-12-01', end: '2026-03-01' }, range);
    expect(outside.leftPct).toBe(0);
    expect(outside.widthPct).toBeCloseTo(100, 5);
  });

  it('limita el progreso entre 0 y 100', () => {
    expect(GanttScale.clampProgress(140)).toBe(100);
    expect(GanttScale.clampProgress(-3)).toBe(0);
    expect(GanttScale.clampProgress(33.4)).toBe(33);
    expect(GanttScale.clampProgress(undefined)).toBeNull();
    expect(GanttScale.clampProgress(Number.NaN)).toBeNull();
  });
});

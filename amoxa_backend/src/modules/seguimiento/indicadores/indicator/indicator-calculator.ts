import type {
  ActionStatusRow,
  AreaCountRow,
  ChartSeries,
  IndicatorRaw,
  Indicators,
} from '@seguimiento-indicadores-indicator/indicator.types.js';

export class IndicatorCalculator {
  private static readonly ACTION_STATES: ReadonlyArray<{ estado: ActionStatusRow['estado']; label: string }> = [
    { estado: 'pendiente', label: 'Pendiente' },
    { estado: 'en_progreso', label: 'En progreso' },
    { estado: 'completada', label: 'Completada' },
    { estado: 'vencida', label: 'Vencida' },
  ];

  public static compute(raw: IndicatorRaw): Indicators {
    const count = (estado: string): number =>
      raw.auditoriasPorEstado.filter((row) => row.estado === estado).reduce((sum, row) => sum + row.total, 0);
    const realizadas = count('cerrada') + count('finalizada');
    const enCurso = count('en_curso');
    const canceladas = count('cancelada');
    const planificadas = count('planificada') + enCurso + realizadas;

    return {
      auditorias_realizadas: realizadas,
      auditorias_planificadas: planificadas,
      hallazgos_abiertos: IndicatorCalculator.sum(raw.incumplimientosPorArea.map((row) => row.pendientes)),
      incumplimientos_totales: IndicatorCalculator.sum(raw.incumplimientosPorArea.map((row) => row.total)),
      acciones_atrasadas: IndicatorCalculator.sum(raw.accionesPorArea.map((row) => row.pendientes)),
      cumplimiento_calendario: IndicatorCalculator.percentage(realizadas, planificadas),
      calendario: { planificadas, realizadas, en_curso: enCurso, canceladas },
      incumplimientos_por_area: IndicatorCalculator.areaSeries('Incumplimientos', raw.incumplimientosPorArea, (row) => row.total),
      atrasadas_por_area: IndicatorCalculator.areaSeries('Acciones atrasadas', raw.accionesPorArea, (row) => row.pendientes),
      acciones_por_estado: IndicatorCalculator.stateSeries(raw.accionesPorEstado),
      acciones_atrasadas_detalle: raw.accionesAtrasadas,
    };
  }

  public static percentage(part: number, whole: number): number {
    if (whole <= 0) {
      return 0;
    }
    return Math.round((part / whole) * 1000) / 10;
  }

  public static empty(): Indicators {
    return IndicatorCalculator.compute({
      auditoriasPorEstado: [],
      incumplimientosPorArea: [],
      accionesPorArea: [],
      accionesPorEstado: [],
      accionesAtrasadas: [],
    });
  }

  private static sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private static areaSeries(label: string, rows: readonly AreaCountRow[], pick: (row: AreaCountRow) => number): ChartSeries {
    const visible = rows
      .filter((row) => pick(row) > 0)
      .sort((a, b) => pick(b) - pick(a) || a.area.localeCompare(b.area, 'es'));
    return { labels: visible.map((row) => row.area), datasets: [{ label, data: visible.map((row) => pick(row)) }] };
  }

  private static stateSeries(rows: readonly ActionStatusRow[]): ChartSeries {
    const visible = IndicatorCalculator.ACTION_STATES.map((state) => ({
      label: state.label,
      total: rows.filter((row) => row.estado === state.estado).reduce((sum, row) => sum + row.total, 0),
    })).filter((state) => state.total > 0);
    return { labels: visible.map((state) => state.label), datasets: [{ label: 'Acciones', data: visible.map((state) => state.total) }] };
  }
}

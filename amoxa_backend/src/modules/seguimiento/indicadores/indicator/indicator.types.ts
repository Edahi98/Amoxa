export interface IndicatorFilters {
  organizacionId: string;
  periodo?: string;
  area?: string;
  programaId?: string;
  hoy?: string;
}

export interface AuditStatusRow {
  estado: 'planificada' | 'en_curso' | 'cerrada' | 'finalizada' | 'cancelada';
  total: number;
}

export interface AreaCountRow {
  procesoId: string;
  area: string;
  total: number;
  pendientes: number;
}

export interface ActionStatusRow {
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
  total: number;
}

export interface OverdueActionRow {
  id: string;
  descripcion: string;
  fechaLimite: string | null;
  estado: string;
  area: string;
  responsable: string;
}

export interface IndicatorRaw {
  auditoriasPorEstado: AuditStatusRow[];
  incumplimientosPorArea: AreaCountRow[];
  accionesPorArea: AreaCountRow[];
  accionesPorEstado: ActionStatusRow[];
  accionesAtrasadas: OverdueActionRow[];
}

export interface ChartSeries {
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
}

export interface CalendarSummary {
  planificadas: number;
  realizadas: number;
  en_curso: number;
  canceladas: number;
}

export interface Indicators {
  auditorias_realizadas: number;
  auditorias_planificadas: number;
  hallazgos_abiertos: number;
  incumplimientos_totales: number;
  acciones_atrasadas: number;
  cumplimiento_calendario: number;
  calendario: CalendarSummary;
  incumplimientos_por_area: ChartSeries;
  atrasadas_por_area: ChartSeries;
  acciones_por_estado: ChartSeries;
  acciones_atrasadas_detalle: OverdueActionRow[];
}

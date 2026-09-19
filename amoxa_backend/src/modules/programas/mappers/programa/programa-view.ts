import type { InferSelectModel } from 'drizzle-orm';
import type { programaAuditoria } from '@schemas/index.js';

export type ProgramaRow = InferSelectModel<typeof programaAuditoria>;

export interface ProgramaProcesoDetail {
  procesoId: string;
  nombre: string;
  importancia: string;
  orden: number;
  puntajeSugerido: number;
}

export interface ProgramaDetail {
  row: ProgramaRow;
  procesos: ProgramaProcesoDetail[];
  creadoPor: string | null;
  aprobadoPor: string | null;
}

export interface ProgramaView {
  id: string;
  periodo: string;
  objetivos: string | null;
  riesgos: string | null;
  frecuencia: string | null;
  metodos: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  procesos_prioritarios: string[];
  procesos: { id: string; nombre: string; importancia: string; orden: number; puntaje_sugerido: number }[];
  prioridad_modificada: boolean;
  justificacion_prioridad: string | null;
  motivo_devolucion: string | null;
  estado: string;
  estado_etiqueta: string;
  version: number;
  creado_por: string | null;
  enviado_en: string | null;
  aprobado_por: string | null;
  aprobado_en: string | null;
}

export interface ProgramaSummary {
  id: string;
  periodo: string;
  estado: string;
  estado_etiqueta: string;
  frecuencia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  version: number;
}

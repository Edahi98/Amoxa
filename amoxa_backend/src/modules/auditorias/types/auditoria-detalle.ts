import type { AuditStatus } from '@auditorias-rules/audit-status-transitions.js';
import type { PlanStatus } from '@auditorias-rules-plan/plan-status-transitions.js';
import type { AgendaEntry, TaskEntry } from '@auditorias-parsers/plan-text-parser.js';

export type AuditMethod = 'in_situ' | 'remoto' | 'mixto';

export interface ProcesoAuditado {
  id: string;
  nombre: string;
  duenoUsuarioId: string;
}

export interface MiembroEquipo {
  auditorId: string;
  nombre: string;
  email: string;
  rol: 'lider' | 'auditor' | 'formacion' | 'experto';
  procesoId: string | null;
}

export interface PlantillaRef {
  id: string;
  nombre: string;
  vigente: boolean;
}

export interface PlanDetalle {
  estado: PlanStatus;
  version: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  agenda: AgendaEntry[];
  tareas: TaskEntry[];
  enviadoEn: Date | null;
  respondidoEn: Date | null;
}

export interface ContactoDetalle {
  informacionSuficiente: boolean;
  cooperacion: boolean;
  tiempo: boolean;
  observaciones: string | null;
  confirmadoEn: Date | null;
  respuestaArea: string | null;
  respondidoEn: Date | null;
}

export interface PropuestaDetalle {
  id: string;
  propuestaPorId: string;
  fechaPropuesta: string;
  motivo: string | null;
  estado: string;
  creadaEn: Date;
}

export interface RevisionAlcanceDetalle {
  revisadoPorId: string | null;
  revisadoEn: Date | null;
  comentario: string | null;
}

export interface AuditoriaDetalle {
  id: string;
  programaId: string;
  organizacionId: string;
  periodo: string;
  programaEstado: string;
  plantilla: PlantillaRef;
  liderId: string;
  liderNombre: string;
  objetivos: string | null;
  criterios: string[];
  metodo: AuditMethod;
  fechaPlan: string | null;
  fechaReal: string | null;
  viabilidadOk: boolean;
  planAprobado: boolean;
  estado: AuditStatus;
  procesos: ProcesoAuditado[];
  equipo: MiembroEquipo[];
  plan: PlanDetalle;
  contacto: ContactoDetalle | null;
  revision: RevisionAlcanceDetalle | null;
  propuestas: PropuestaDetalle[];
}

export interface AuditoriaResumen {
  id: string;
  programaId: string;
  periodo: string;
  estado: AuditStatus;
  metodo: AuditMethod;
  fechaPlan: string | null;
  liderId: string;
  liderNombre: string;
  plantilla: PlantillaRef;
  procesos: { id: string; nombre: string }[];
  viabilidadOk: boolean;
  planAprobado: boolean;
  planEstado: PlanStatus;
}

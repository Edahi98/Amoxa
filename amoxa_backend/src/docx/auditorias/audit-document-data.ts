export interface AuditTeamRow {
  nombre: string;
  rol: string;
  email: string;
}

export interface AuditAgendaRow {
  fecha: string | null;
  actividad: string;
}

export interface AuditTaskGroup {
  auditor: string;
  tareas: string[];
}

export interface AuditPlanDocumentData {
  organizacion: string;
  auditoriaId: string;
  periodo: string;
  objetivo: string | null;
  procesos: string[];
  criterios: string[];
  metodo: string;
  plantilla: string;
  lider: string;
  equipo: AuditTeamRow[];
  fechaInicio: string | null;
  fechaFin: string | null;
  agenda: AuditAgendaRow[];
  tareas: AuditTaskGroup[];
  estadoPlan: string;
  planVersion: number;
  aprobadoEn: string | null;
  generatedAt?: Date;
}

export interface AuditNotificationDocumentData {
  organizacion: string;
  auditoriaId: string;
  periodo: string;
  procesos: string[];
  criterios: string[];
  metodo: string;
  lider: string;
  equipo: AuditTeamRow[];
  fechaInicio: string | null;
  fechaFin: string | null;
  objetivo: string | null;
  generatedAt?: Date;
}

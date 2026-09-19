import type { EstadoAuditor } from '@auditores-rules/competence-calculator.js';

export interface AuditorRecord {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  disciplinas: string[] | null;
  formacion: string | null;
  experiencia: string | null;
  estado: EstadoAuditor | null;
  vigenciaHasta: string | null;
}

export interface EvaluacionRecord {
  id: string;
  auditorId: string;
  fecha: string;
  resultado: 'satisfactorio' | 'no_satisfactorio';
  observaciones: string | null;
  estadoResultante: EstadoAuditor;
  vigenciaHasta: string | null;
  evaluador: string;
  metodos: string[];
}

export interface EvaluacionView {
  id: string;
  fecha: string;
  resultado: string;
  resultado_etiqueta: string;
  metodos: string[];
  metodos_etiquetas: string[];
  observaciones: string | null;
  evaluador: string;
  estado_resultante: string;
  apto: string;
  vigencia_hasta: string | null;
}

export interface AuditorSummary {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  estado_etiqueta: string;
  apto: string;
  vigente: boolean;
  vigencia_hasta: string | null;
  title: string;
  description: string;
  status: string;
}

export interface AuditorView extends AuditorSummary {
  formacion: string | null;
  experiencia: string | null;
  especialidades: string;
  disciplinas: string[];
  evaluaciones: EvaluacionView[];
}

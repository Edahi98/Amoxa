import type { FindingKind } from '@ejecucion-reglas/finding-rules.js';

export interface FindingAcceptanceView {
  usuarioId: string;
  usuario: string;
  acepta: boolean;
  motivo: string | null;
  fecha: string;
}

export interface FindingReviewView {
  momento: 'previa' | 'cierre';
  resultadoArea: 'aceptado' | 'discrepa' | null;
  comentario: string | null;
  revisadoPor: string;
  fecha: string;
}

export interface HallazgoView {
  id: string;
  auditoriaId: string;
  respuestaId: string;
  procesoId: string;
  proceso: string;
  kind: FindingKind;
  tipo: string;
  clasificacion: string | null;
  clausula: string | null;
  descripcion: string;
  confirmado: boolean;
  discrepancia: string | null;
  estado: string;
  evidenciaCount: number;
  evidenciasVerificadas: boolean;
  revisado: boolean;
  resultadoArea: 'aceptado' | 'discrepa' | null;
  revisiones: FindingReviewView[];
  aceptaciones: FindingAcceptanceView[];
}

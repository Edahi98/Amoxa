import type { ChecklistProgressResult } from '@ejecucion-reglas-checklist/checklist-progress.js';
import type { ClientCriterion, ClientResult } from '@ejecucion-reglas-checklist/checklist-mapper.js';
import type { EvidenceView } from '@ejecucion-evidencia/evidence-view.js';

export interface ChecklistAnswerView {
  id: string;
  result: ClientResult;
  comment: string | null;
  verificada: boolean;
  version: number;
  auditorId: string;
  respondidaEn: string;
  evidencias: EvidenceView[];
}

export interface ChecklistQuestionView {
  clave: string;
  preguntaId: string;
  orden: number;
  texto: string;
  clausula: string | null;
  criterio: ClientCriterion;
  tipoRespuesta: string;
  evidenciaObligatoria: boolean;
  respuesta: ChecklistAnswerView | null;
}

export interface ChecklistView {
  auditoriaId: string;
  estado: string;
  version: number;
  progreso: ChecklistProgressResult;
  preguntas: ChecklistQuestionView[];
}

export interface ChecklistSaveResult {
  aplicadas: number;
  sinCambios: number;
  repetida: boolean;
  version: number;
  progreso: ChecklistProgressResult;
}

export interface ChecklistSaveMeta {
  idempotencyKey?: string;
  ifVersion?: number;
}

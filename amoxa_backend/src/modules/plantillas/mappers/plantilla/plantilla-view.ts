import type { InferSelectModel } from 'drizzle-orm';
import type { plantillaChecklist, pregunta, propuestaPregunta } from '@schemas/index.js';
import type { CoverageReport } from '@plantillas-rules/template-coverage.js';

export type PlantillaRow = InferSelectModel<typeof plantillaChecklist>;
export type PreguntaRow = InferSelectModel<typeof pregunta>;
export type PropuestaRow = InferSelectModel<typeof propuestaPregunta>;

export interface PropuestaDetail {
  row: PropuestaRow;
  propuestaPor: string;
}

export interface PlantillaDetail {
  row: PlantillaRow;
  preguntas: PreguntaRow[];
  propuestas: PropuestaDetail[];
}

export interface PreguntaView {
  id: string;
  orden: number;
  texto: string;
  clausula: string | null;
  criterio: string;
  criterio_etiqueta: string;
  tipo_respuesta: string;
  evidencia_obligatoria: boolean;
  title: string;
  description: string;
}

export interface PropuestaView {
  id: string;
  texto: string;
  clausula: string | null;
  criterio: string;
  estado: string;
  propuesta_por: string;
  title: string;
  description: string;
}

export interface PlantillaView {
  id: string;
  nombre: string;
  version: number;
  estado: string;
  estado_etiqueta: string;
  vigente: boolean;
  publicada_en: string | null;
  preguntas: PreguntaView[];
  propuestas: PropuestaView[];
  cobertura: CoverageReport;
}

export interface PlantillaSummary {
  id: string;
  nombre: string;
  version: number;
  estado: string;
  estado_etiqueta: string;
  vigente: boolean;
  total_preguntas: number;
  cobertura: { iso9001: boolean; propios: boolean };
}

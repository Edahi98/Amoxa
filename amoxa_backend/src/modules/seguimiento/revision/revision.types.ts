import type { Indicators } from '@seguimiento-indicadores-indicator/indicator.types.js';

export interface ProgramSummary {
  id: string;
  periodo: string;
  estado: 'borrador' | 'pendiente_aprobacion' | 'devuelto' | 'aprobado' | 'en_ejecucion' | 'cerrado';
  version: number;
  objetivos: string | null;
}

export interface ReviewEvent {
  id: string;
  creadaEn: Date;
  autor: string;
  resumen: string | null;
  decisiones: string | null;
  recursos: string | null;
}

export interface LessonEntry {
  id: string;
  creadaEn: Date;
  autor: string;
  texto: string;
}

export interface RevisionView {
  programa: ProgramSummary;
  revision: { resumen: string; decisiones: string; recursos: string };
  indicadores: Indicators;
  presentaciones: ReviewEvent[];
  decisiones: ReviewEvent[];
  lecciones: LessonEntry[];
}

export interface RevisionWriteResult {
  id: string;
  version: number;
}

export interface NextProgramResult {
  id: string;
  periodo: string;
  estado: 'borrador';
  version: number;
  origenId: string;
}

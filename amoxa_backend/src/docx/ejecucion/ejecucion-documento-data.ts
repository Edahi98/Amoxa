export interface AuditoriaResumenDoc {
  titulo: string;
  lider: string;
  metodo: string;
  fechaPlan: string | null;
  fechaReal: string | null;
  estado: string;
  procesos: string[];
}

export interface EvidenciaDoc {
  nombre: string;
  capturadoEn: string;
  ubicacion: string | null;
  sha256: string | null;
  almacenado: boolean;
}

export interface PreguntaAplicadaDoc {
  orden: number;
  texto: string;
  clausula: string | null;
  criterio: string;
  resultado: 'C' | 'NC' | 'NA' | null;
  comentario: string | null;
  verificada: boolean;
  evidencias: EvidenciaDoc[];
}

export interface ChecklistAplicadoData {
  organizacion: string;
  auditoria: AuditoriaResumenDoc;
  plantilla: string;
  progreso: { total: number; respondidas: number; avance: number };
  preguntas: PreguntaAplicadaDoc[];
  auditores: string[];
  generadoEn?: Date;
}

export interface AsistenteDoc {
  nombre: string;
  rol: string;
  rolReunion: 'preside' | 'asiste';
  confirmadaEn: string | null;
}

export interface HallazgoDoc {
  numero: number;
  tipo: string;
  proceso: string;
  clausula: string | null;
  descripcion: string;
  estado: string;
  evidencias: number;
  evidenciasVerificadas: boolean;
  revisionArea: 'aceptado' | 'discrepa' | null;
  comentarioRevision: string | null;
  aceptacion: 'acepta' | 'discrepa' | 'pendiente';
  motivoDiscrepancia: string | null;
}

export interface ActaReunionData {
  organizacion: string;
  tipo: 'apertura' | 'cierre';
  auditoria: AuditoriaResumenDoc;
  registrada: boolean;
  dirigidaPor: string | null;
  realizadaEn: string | null;
  notas: string | null;
  asistentes: AsistenteDoc[];
  hallazgos: HallazgoDoc[];
  generadoEn?: Date;
}

export interface RegistroHallazgosData {
  organizacion: string;
  auditoria: AuditoriaResumenDoc;
  hallazgos: HallazgoDoc[];
  generadoEn?: Date;
}

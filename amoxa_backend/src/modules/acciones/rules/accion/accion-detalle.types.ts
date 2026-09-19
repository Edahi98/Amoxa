import type { AccionEstadoPantalla } from '@acciones-rules-accion/accion.types.js';

export interface AccionEvidenciaDetalle {
  id: string;
  etapa: string;
  ciclo: number;
  nombre: string | null;
  url: string | null;
  tipo: string | null;
  hash: string | null;
}

export interface AccionVerificacionDetalle {
  ciclo: number;
  verificadorNombre: string;
  eficaz: boolean;
  comentario: string | null;
  nuevaFecha: string | null;
  verificadoEn: string;
}

export interface AccionHallazgoDetalle {
  id: string;
  auditoriaId: string;
  procesoId: string;
  proceso: string;
  tipo: 'conformidad' | 'NC' | 'OM' | 'buena_practica';
  clasificacion: 'menor' | 'mayor' | null;
  criterio: string | null;
  descripcion: string;
  estado: 'abierto' | 'en_verificacion' | 'cerrado';
}

export interface AccionDetalle {
  id: string;
  organizacionId: string;
  organizacionNombre: string;
  hallazgo: AccionHallazgoDetalle;
  responsableId: string;
  responsableNombre: string;
  descripcion: string;
  causaRaiz: string | null;
  fechaLimite: string | null;
  fechaCierre: string | null;
  estadoDb: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
  verificacionEficacia: 'ok' | 'no_ok' | 'pendiente';
  estado: AccionEstadoPantalla;
  reaperturas: number;
  ciclo: number;
  diasRestantes: number | null;
  comentarioCierre: string | null;
  evidencias: AccionEvidenciaDetalle[];
  verificaciones: AccionVerificacionDetalle[];
}

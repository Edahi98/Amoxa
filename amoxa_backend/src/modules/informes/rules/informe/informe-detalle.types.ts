import type { HallazgoResumen, InformeEstado } from '@informes-rules-informe/informe.types.js';

export interface InformeMiembro {
  nombre: string;
  rol: string;
}

export interface InformeFirmaDetalle {
  firmanteId: string;
  firmanteNombre: string;
  firmadoEn: string;
  huella: string;
}

export interface InformeDistribucionDetalle {
  usuarioId: string;
  nombre: string;
  rol: string;
  fechaEnvio: string;
  leido: boolean;
  leidoEn: string | null;
}

export interface InformeAccionDetalle {
  id: string;
  hallazgoId: string;
  descripcion: string;
  causaRaiz: string | null;
  responsable: string;
  fechaLimite: string | null;
  estado: string;
}

export interface InformeDetalle {
  id: string;
  auditoriaId: string;
  organizacionId: string;
  organizacionNombre: string;
  periodo: string;
  estado: InformeEstado;
  titulo: string;
  liderId: string;
  liderNombre: string;
  metodo: string;
  objetivos: string | null;
  criterios: string[];
  procesos: string[];
  procesoIds: string[];
  equipo: InformeMiembro[];
  hallazgos: HallazgoResumen[];
  fechaPlan: string | null;
  fechaReal: string | null;
  conclusiones: string | null;
  gradoConformidad: string | null;
  declaracionMuestreo: string | null;
  fechaEmision: string | null;
  aprobadoPorId: string | null;
  aprobadoPorNombre: string | null;
  firma: InformeFirmaDetalle | null;
  huellaActual: string;
  distribucion: InformeDistribucionDetalle[];
  acciones: InformeAccionDetalle[];
}

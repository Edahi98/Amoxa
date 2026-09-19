import type { DbRole } from '@auth-roles/role-mapper.js';
export type InformeEstado = 'borrador' | 'firmado' | 'distribuido';

export interface HallazgoResumen {
  id: string;
  tipo: 'conformidad' | 'NC' | 'OM' | 'buena_practica';
  clasificacion: 'menor' | 'mayor' | null;
  criterio: string | null;
  descripcion: string;
  estado: 'abierto' | 'en_verificacion' | 'cerrado';
  proceso: string;
}

export interface DestinatarioCandidato {
  id: string;
  rol: DbRole;
}

export interface InformeContentInput {
  objetivos: string | null;
  criterios: readonly string[];
  procesos: readonly string[];
  equipo: readonly string[];
  hallazgos: readonly HallazgoResumen[];
  fechaPlan: string | null;
  fechaReal: string | null;
  conclusiones: string | null;
}

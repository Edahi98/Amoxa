export type AccionEstadoPantalla = 'abierta' | 'reportada' | 'verificada' | 'reabierta' | 'vencida';

export type AlertaTipo = 'previa_7' | 'previa_1' | 'vencida';

export interface AccionEstadoInput {
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
  fechaCierre: string | null;
  verificacionEficacia: 'ok' | 'no_ok' | 'pendiente';
  reaperturas: number;
}

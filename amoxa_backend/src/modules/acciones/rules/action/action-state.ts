import type { AccionEstadoInput, AccionEstadoPantalla } from '@acciones-rules-accion/accion.types.js';

export class ActionState {
  public static resolve(input: AccionEstadoInput): AccionEstadoPantalla {
    if (input.estado === 'completada') {
      return input.verificacionEficacia === 'ok' ? 'verificada' : 'reportada';
    }
    if (input.estado === 'vencida') {
      return 'vencida';
    }
    return input.reaperturas > 0 ? 'reabierta' : 'abierta';
  }

  public static isPendingVerification(estado: AccionEstadoPantalla): boolean {
    return estado === 'reportada';
  }

  public static isOpen(estado: AccionEstadoPantalla): boolean {
    return estado === 'abierta' || estado === 'reabierta' || estado === 'vencida';
  }
}

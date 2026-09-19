import { UnprocessableEntityException } from '@nestjs/common';
import type { AccionEstadoPantalla } from '@acciones-rules-accion/accion.types.js';
import { ActionState } from '@acciones-rules-action/action-state.js';

export class ActionTransitions {
  public static assertCanReport(estado: AccionEstadoPantalla, evidenceCount: number): void {
    if (!ActionState.isOpen(estado)) {
      throw new UnprocessableEntityException('La acción ya fue reportada como ejecutada o ya está verificada.');
    }
    if (evidenceCount === 0) {
      throw new UnprocessableEntityException('No se puede reportar el cierre sin adjuntar la prueba de que la acción se ejecutó.');
    }
  }

  public static assertCanVerify(estado: AccionEstadoPantalla, evidenceCount: number): void {
    if (!ActionState.isPendingVerification(estado)) {
      throw new UnprocessableEntityException('Solo se puede verificar la eficacia de una acción reportada como ejecutada.');
    }
    if (evidenceCount === 0) {
      throw new UnprocessableEntityException('Adjunte la evidencia de la verificación de eficacia.');
    }
  }
}

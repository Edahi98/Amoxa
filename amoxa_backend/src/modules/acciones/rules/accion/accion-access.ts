import type { SessionRole } from '@shared/roles.js';
import type { AccionDetalle } from '@acciones-rules-accion/accion-detalle.types.js';
import { ActionState } from '@acciones-rules-action/action-state.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { VerifierEligibility } from '@acciones-rules/verifier-eligibility.js';

export class AccionAccess {
  public static canRead(detail: AccionDetalle, role: SessionRole, userId: string): boolean {
    if (RoleAccess.actsAs(role, 'gestor')) {
      return true;
    }
    if (role === 'dueno_proceso') {
      return detail.responsableId === userId;
    }
    if (role === 'auditor') {
      return ActionState.isPendingVerification(detail.estado) && VerifierEligibility.isEligible(userId, detail.responsableId);
    }
    return false;
  }
}

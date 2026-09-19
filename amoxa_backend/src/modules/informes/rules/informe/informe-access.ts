import type { SessionRole } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';

export interface InformeViewer {
  userId: string;
  role: SessionRole;
  processIds: readonly string[];
}

export class InformeAccess {
  public static canRead(detail: InformeDetalle, viewer: InformeViewer): boolean {
    if (RoleAccess.actsAs(viewer.role, 'gestor')) {
      return true;
    }
    if (viewer.role === 'lider') {
      return detail.liderId === viewer.userId;
    }
    if (detail.estado !== 'distribuido') {
      return false;
    }
    if (RoleAccess.actsAs(viewer.role, 'direccion')) {
      return true;
    }
    if (viewer.role === 'dueno_proceso') {
      const recipient = detail.distribucion.some((item) => item.usuarioId === viewer.userId);
      return recipient || detail.procesoIds.some((id) => viewer.processIds.includes(id));
    }
    return false;
  }

  public static canAcknowledge(detail: InformeDetalle, viewer: InformeViewer): boolean {
    return detail.estado === 'distribuido' && RoleAccess.actsAs(viewer.role, 'direccion');
  }
}

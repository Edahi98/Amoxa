import { ForbiddenException } from '@nestjs/common';
import type { SessionRole } from '@shared/roles.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';
import { RoleMapper, type DbRole } from '@auth-roles/role-mapper.js';

export class SolicitudHierarchy {
  public static canHandle(actor: SessionRole, target: DbRole): boolean {
    if (target === 'superusuario') {
      return false;
    }
    if (actor === 'superusuario') {
      return true;
    }
    return actor === 'administrador' && target !== 'administrador';
  }

  public static assertCanHandle(actor: SessionRole, target: DbRole): void {
    if (!SolicitudHierarchy.canHandle(actor, target)) {
      throw new ForbiddenException('No puedes gestionar esta solicitud');
    }
  }

  public static handleableDbRoles(actor: SessionRole): DbRole[] {
    return RoleCatalog.assignable()
      .map((role) => RoleMapper.toDbRole(role))
      .filter((target) => SolicitudHierarchy.canHandle(actor, target));
  }
}

import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionRole } from '@shared/roles.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';

export class RequestRole {
  public static resolve(request: Request): SessionRole {
    const dbRole = request.user?.rol;
    const role = dbRole === undefined ? undefined : RoleMapper.find(dbRole);
    if (role === undefined) {
      throw new ForbiddenException('Rol no válido');
    }
    return role;
  }
}

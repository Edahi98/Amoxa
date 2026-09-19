import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Permission } from '@shared/roles.js';
import { AuthorizationMetadata } from '@auth-decorators/authorization-metadata.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { RoleAccess } from '@auth-roles/role-access.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<readonly Permission[] | undefined>(
      AuthorizationMetadata.PERMISSIONS_KEY,
      targets,
    );
    const anyOf = this.reflector.getAllAndOverride<readonly Permission[] | undefined>(
      AuthorizationMetadata.ANY_PERMISSIONS_KEY,
      targets,
    );
    const hasAll = required !== undefined && required.length > 0;
    const hasAny = anyOf !== undefined && anyOf.length > 0;
    if (!hasAll && !hasAny) {
      return true;
    }

    const role = RequestRole.resolve(context.switchToHttp().getRequest<Request>());
    const allowedAll = !hasAll || required.every((permission) => RoleAccess.can(role, permission));
    const allowedAny = !hasAny || anyOf.some((permission) => RoleAccess.can(role, permission));
    if (!allowedAll || !allowedAny) {
      throw new ForbiddenException('Permiso insuficiente');
    }
    return true;
  }
}

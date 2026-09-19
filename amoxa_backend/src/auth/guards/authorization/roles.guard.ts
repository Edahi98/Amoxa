import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { SessionRole } from '@shared/roles.js';
import { AuthorizationMetadata } from '@auth-decorators/authorization-metadata.js';
import { RequestRole } from '@auth-roles/request-role.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<readonly SessionRole[] | undefined>(AuthorizationMetadata.ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed === undefined || allowed.length === 0) {
      return true;
    }

    const role = RequestRole.resolve(context.switchToHttp().getRequest<Request>());
    if (!allowed.includes(role)) {
      throw new ForbiddenException('Rol sin acceso');
    }
    return true;
  }
}

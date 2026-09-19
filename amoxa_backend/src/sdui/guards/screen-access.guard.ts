import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RequestRole } from '@auth-roles/request-role.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { ScreenRegistry } from '@sdui-registry/screen-registry.js';

@Injectable()
export class ScreenAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const screenId = request.params['screenId'];
    if (typeof screenId !== 'string' || ScreenRegistry.findByScreenId(screenId) === undefined) {
      return true;
    }

    if (!RoleAccess.canSee(RequestRole.resolve(request), screenId)) {
      throw new ForbiddenException('No tiene acceso a esta pantalla');
    }
    return true;
  }
}

import { applyDecorators, UseGuards } from '@nestjs/common';
import type { Permission, SessionRole } from '@shared/roles.js';
import { PermissionsDecorator } from '@auth-decorators/permissions.decorator.js';
import { RolesDecorator } from '@auth-decorators/roles.decorator.js';
import { JwtAuthGuard } from '@auth-guards/jwt-auth.guard.js';
import { PermissionsGuard } from '@auth-guards-authorization/permissions.guard.js';
import { RoleExistsGuard } from '@auth-guards-authorization/role-exists.guard.js';
import { RolesGuard } from '@auth-guards-authorization/roles.guard.js';

export class Authorized {
  public static session() {
    return applyDecorators(UseGuards(JwtAuthGuard, RoleExistsGuard));
  }

  public static permissions(...permissions: Permission[]) {
    return applyDecorators(
      UseGuards(JwtAuthGuard, RoleExistsGuard, PermissionsGuard),
      PermissionsDecorator.of(...permissions),
    );
  }

  public static anyPermission(...permissions: Permission[]) {
    return applyDecorators(
      UseGuards(JwtAuthGuard, RoleExistsGuard, PermissionsGuard),
      PermissionsDecorator.anyOf(...permissions),
    );
  }

  public static roles(...roles: SessionRole[]) {
    return applyDecorators(UseGuards(JwtAuthGuard, RoleExistsGuard, RolesGuard), RolesDecorator.of(...roles));
  }
}

import { SetMetadata } from '@nestjs/common';
import type { SessionRole } from '@shared/roles.js';
import { AuthorizationMetadata } from '@auth-decorators/authorization-metadata.js';

export class RolesDecorator {
  public static of(...roles: SessionRole[]) {
    return SetMetadata(AuthorizationMetadata.ROLES_KEY, roles);
  }
}

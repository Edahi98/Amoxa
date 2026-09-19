import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@shared/roles.js';
import { AuthorizationMetadata } from '@auth-decorators/authorization-metadata.js';

export class PermissionsDecorator {
  public static of(...permissions: Permission[]) {
    return SetMetadata(AuthorizationMetadata.PERMISSIONS_KEY, permissions);
  }

  public static anyOf(...permissions: Permission[]) {
    return SetMetadata(AuthorizationMetadata.ANY_PERMISSIONS_KEY, permissions);
  }
}

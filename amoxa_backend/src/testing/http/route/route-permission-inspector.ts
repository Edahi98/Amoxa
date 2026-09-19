import { AuthorizationMetadata } from '@auth-decorators/authorization-metadata.js';

export interface RoutePermissions {
  all: string[];
  any: string[];
}

export class RoutePermissionInspector {
  public static of(controller: abstract new (...args: never[]) => object, route: string): RoutePermissions {
    const handler = (controller.prototype as Record<string, unknown>)[route] as object;
    return {
      all: Reflect.getMetadata(AuthorizationMetadata.PERMISSIONS_KEY, handler) ?? [],
      any: Reflect.getMetadata(AuthorizationMetadata.ANY_PERMISSIONS_KEY, handler) ?? [],
    };
  }
}

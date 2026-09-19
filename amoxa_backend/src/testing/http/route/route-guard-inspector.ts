import { JwtAuthGuard } from '@auth-guards/jwt-auth.guard.js';
import { RoleExistsGuard } from '@auth-guards-authorization/role-exists.guard.js';

export interface RouteGuardReport {
  route: string;
  guards: string[];
}

export class RouteGuardInspector {
  public static routes(controller: abstract new (...args: never[]) => object): RouteGuardReport[] {
    const prototype = controller.prototype as Record<string, unknown>;
    const classGuards: unknown[] = Reflect.getMetadata('__guards__', controller) ?? [];

    return Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== 'constructor' && typeof prototype[name] === 'function')
      .filter((name) => Reflect.getMetadata('path', prototype[name] as object) !== undefined)
      .map((name) => {
        const handler = prototype[name] as object;
        const methodGuards: unknown[] = Reflect.getMetadata('__guards__', handler) ?? [];
        const guards = [...classGuards, ...methodGuards].map((guard) => (guard as { name: string }).name);
        return { route: name, guards };
      });
  }

  public static unprotected(controller: abstract new (...args: never[]) => object): string[] {
    return RouteGuardInspector.routes(controller)
      .filter(
        (report) => !report.guards.includes(JwtAuthGuard.name) || !report.guards.includes(RoleExistsGuard.name),
      )
      .map((report) => report.route);
  }

  public static guardsOf(controller: abstract new (...args: never[]) => object, route: string): string[] {
    return RouteGuardInspector.routes(controller).find((report) => report.route === route)?.guards ?? [];
  }
}

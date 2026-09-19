import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { rol, usuario } from '@schemas/index.js';
import { RequestRole } from '@auth-roles/request-role.js';

@Injectable()
export class RoleExistsGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Db) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.sub;
    if (userId === undefined) {
      throw new ForbiddenException('Rol no válido');
    }

    const [current] = await this.db
      .select({ rol: usuario.rol, activo: usuario.activo })
      .from(usuario)
      .where(eq(usuario.id, userId))
      .limit(1);
    if (!current || !current.activo) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    request.user = { ...request.user!, rol: current.rol };

    const clave = RequestRole.resolve(request);
    const [found] = await this.db.select({ id: rol.id }).from(rol).where(eq(rol.clave, clave)).limit(1);
    if (!found) {
      throw new ForbiddenException('Rol no válido');
    }
    return true;
  }
}

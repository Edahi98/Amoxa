import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { passwordRequest, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import { SolicitudHierarchy } from '@solicitudes-services-solicitud/solicitud-hierarchy.js';

export interface SolicitudPendiente {
  id: string;
  tipo: 'invite' | 'reset';
  creadaEn: Date;
  ip: string | null;
  usuario: { id: string; nombre: string; email: string; rol: SessionRole };
}

@Injectable()
export class SolicitudQueryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async pendingFor(actor: SessionRole): Promise<SolicitudPendiente[]> {
    const handleable = SolicitudHierarchy.handleableDbRoles(actor);
    if (handleable.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        id: passwordRequest.id,
        tipo: passwordRequest.type,
        creadaEn: passwordRequest.createdAt,
        ip: passwordRequest.requestedIp,
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      })
      .from(passwordRequest)
      .innerJoin(usuario, eq(usuario.id, passwordRequest.usuarioId))
      .where(and(eq(passwordRequest.status, 'pending'), inArray(usuario.rol, handleable)))
      .orderBy(asc(passwordRequest.createdAt));

    return rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      creadaEn: row.creadaEn,
      ip: row.ip,
      usuario: { id: row.usuarioId, nombre: row.nombre, email: row.email, rol: RoleMapper.toSessionRole(row.rol) },
    }));
  }
}

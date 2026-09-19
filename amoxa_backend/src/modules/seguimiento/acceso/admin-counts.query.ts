import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { notificacion, passwordRequest, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { SolicitudHierarchy } from '@solicitudes-services-solicitud/solicitud-hierarchy.js';

export interface AdminCounts {
  notificaciones_sin_leer: number;
  solicitudes_pendientes: number;
  invitaciones_pendientes: number;
  usuarios_activos: number;
}

@Injectable()
export class AdminCountsQuery {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async load(user: TokenPayload, role: SessionRole): Promise<AdminCounts> {
    const handleable = SolicitudHierarchy.handleableDbRoles(role);
    const [[unread], [requests], [invites], [active]] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(notificacion)
        .where(and(eq(notificacion.usuarioId, user.sub), isNull(notificacion.leidaEn))),
      handleable.length === 0
        ? Promise.resolve([{ total: 0 }])
        : this.db
            .select({ total: count() })
            .from(passwordRequest)
            .innerJoin(usuario, eq(usuario.id, passwordRequest.usuarioId))
            .where(and(eq(passwordRequest.status, 'pending'), inArray(usuario.rol, handleable))),
      this.db
        .select({ total: count() })
        .from(passwordRequest)
        .where(and(eq(passwordRequest.type, 'invite'), eq(passwordRequest.status, 'approved'))),
      this.db.select({ total: count() }).from(usuario).where(eq(usuario.activo, true)),
    ]);
    return {
      notificaciones_sin_leer: unread?.total ?? 0,
      solicitudes_pendientes: requests?.total ?? 0,
      invitaciones_pendientes: invites?.total ?? 0,
      usuarios_activos: active?.total ?? 0,
    };
  }
}

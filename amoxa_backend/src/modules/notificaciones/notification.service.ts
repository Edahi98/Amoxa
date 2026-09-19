import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { notificacion, usuario } from '@schemas/index.js';
import type { RoleKey } from '@shared/roles.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';

export interface NoticeInput {
  tipo: string;
  titulo: string;
  mensaje: string;
  entidadTipo?: string;
  entidadId?: string;
}

@Injectable()
export class NotificationService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async notifyUsers(usuarioIds: readonly string[], notice: NoticeInput, executor: DbExecutor = this.db): Promise<number> {
    const unique = [...new Set(usuarioIds)];
    if (unique.length === 0) {
      return 0;
    }
    await executor.insert(notificacion).values(unique.map((usuarioId) => ({ usuarioId, ...notice })));
    return unique.length;
  }

  async notifyRole(
    organizacionId: string,
    role: RoleKey,
    notice: NoticeInput,
    executor: DbExecutor = this.db,
  ): Promise<number> {
    const dbRoles = RoleMapper.dbRolesFor(role);
    if (dbRoles.length === 0) {
      return 0;
    }
    const recipients = await executor
      .select({ id: usuario.id })
      .from(usuario)
      .where(and(eq(usuario.organizacionId, organizacionId), inArray(usuario.rol, [...dbRoles])));
    return this.notifyUsers(
      recipients.map((row) => row.id),
      notice,
      executor,
    );
  }

  async listFor(usuarioId: string, onlyUnread = false, limit = 100, executor: DbExecutor = this.db) {
    const conditions = onlyUnread
      ? and(eq(notificacion.usuarioId, usuarioId), isNull(notificacion.leidaEn))
      : eq(notificacion.usuarioId, usuarioId);
    return executor.select().from(notificacion).where(conditions).orderBy(desc(notificacion.creadaEn)).limit(limit);
  }

  async markRead(usuarioId: string, ids?: readonly string[], executor: DbExecutor = this.db): Promise<number> {
    const target = ids === undefined || ids.length === 0
      ? and(eq(notificacion.usuarioId, usuarioId), isNull(notificacion.leidaEn))
      : and(eq(notificacion.usuarioId, usuarioId), isNull(notificacion.leidaEn), inArray(notificacion.id, [...ids]));
    const updated = await executor
      .update(notificacion)
      .set({ leidaEn: new Date() })
      .where(target)
      .returning({ id: notificacion.id });
    return updated.length;
  }
}

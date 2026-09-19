import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { auditoria, auditoriaProceso, equipoAuditoria, programaAuditoria, proceso, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { AuditoriaContext } from '@ejecucion-acceso-auditoria/auditoria-context.js';

@Injectable()
export class AuditoriaAccessService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async load(auditoriaId: string, user: TokenPayload, executor: DbExecutor = this.db): Promise<AuditoriaContext> {
    const [row] = await executor
      .select({ auditoria })
      .from(auditoria)
      .innerJoin(programaAuditoria, eq(programaAuditoria.id, auditoria.programaId))
      .where(and(eq(auditoria.id, auditoriaId), eq(programaAuditoria.organizacionId, user.organizacionId)))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException('Auditoría no encontrada');
    }
    const procesos = await executor
      .select({ id: auditoriaProceso.procesoId })
      .from(auditoriaProceso)
      .where(and(eq(auditoriaProceso.auditoriaId, auditoriaId), isNull(auditoriaProceso.retiradoEn)));
    return {
      auditoria: row.auditoria,
      organizacionId: user.organizacionId,
      procesoIds: procesos.map((item) => item.id),
    };
  }

  async loadAsMember(auditoriaId: string, user: TokenPayload, executor: DbExecutor = this.db): Promise<AuditoriaContext> {
    const context = await this.load(auditoriaId, user, executor);
    await this.assertMember(context, user, executor);
    return context;
  }

  async assertMember(context: AuditoriaContext, user: TokenPayload, executor: DbExecutor = this.db): Promise<void> {
    if (user.rol === 'lider_auditor') {
      if (context.auditoria.liderId !== user.sub) {
        throw new ForbiddenException('Solo el líder asignado a la auditoría puede realizar esta acción.');
      }
      return;
    }
    if (user.rol === 'auditor') {
      const [member] = await executor
        .select({ auditorId: equipoAuditoria.auditorId })
        .from(equipoAuditoria)
        .where(
          and(
            eq(equipoAuditoria.auditoriaId, context.auditoria.id),
            eq(equipoAuditoria.auditorId, user.sub),
            isNull(equipoAuditoria.retiradoEn),
          ),
        )
        .limit(1);
      if (member === undefined) {
        throw new ForbiddenException('No forma parte del equipo auditor de esta auditoría.');
      }
      return;
    }
    if (user.rol === 'auditado') {
      if (!(await this.ownsAnyProcess(context, user.sub, executor))) {
        throw new ForbiddenException('La auditoría no incluye procesos de su área.');
      }
    }
  }

  async ownedProcessIds(context: AuditoriaContext, userId: string, executor: DbExecutor = this.db): Promise<string[]> {
    if (context.procesoIds.length === 0) {
      return [];
    }
    const [person] = await executor
      .select({ procesoId: usuario.procesoId })
      .from(usuario)
      .where(eq(usuario.id, userId))
      .limit(1);
    const owned = await executor
      .select({ id: proceso.id })
      .from(proceso)
      .where(
        and(
          inArray(proceso.id, context.procesoIds),
          or(eq(proceso.duenoUsuarioId, userId), person?.procesoId ? eq(proceso.id, person.procesoId) : undefined),
        ),
      );
    return owned.map((item) => item.id);
  }

  async ownsAnyProcess(context: AuditoriaContext, userId: string, executor: DbExecutor = this.db): Promise<boolean> {
    return (await this.ownedProcessIds(context, userId, executor)).length > 0;
  }
}

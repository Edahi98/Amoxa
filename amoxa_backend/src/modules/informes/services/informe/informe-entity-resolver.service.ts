import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, informe, programaAuditoria } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';

@Injectable()
export class InformeEntityResolverService {
  private static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly drafts: InformeDraftService,
    private readonly reader: InformeReadService,
  ) {}

  async resolve(
    entityId: string | undefined,
    user: TokenPayload,
    role: SessionRole,
    preferredStates: readonly string[] = [],
  ): Promise<string | undefined> {
    if (entityId !== undefined && InformeEntityResolverService.UUID.test(entityId)) {
      const [direct] = await this.db
        .select({ id: informe.id })
        .from(informe)
        .innerJoin(auditoria, eq(informe.auditoriaId, auditoria.id))
        .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
        .where(and(eq(informe.id, entityId), eq(programaAuditoria.organizacionId, user.organizacionId)));
      if (direct !== undefined) {
        return direct.id;
      }
      const [audit] = await this.db
        .select({ id: auditoria.id })
        .from(auditoria)
        .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
        .where(and(eq(auditoria.id, entityId), eq(programaAuditoria.organizacionId, user.organizacionId)));
      if (audit !== undefined) {
        const draft = await this.drafts.ensureFor(audit.id, user.organizacionId);
        return draft?.informeId;
      }
      return undefined;
    }

    if (role === 'lider') {
      const closed = await this.db
        .select({ id: auditoria.id })
        .from(auditoria)
        .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
        .where(
          and(
            eq(auditoria.liderId, user.sub),
            eq(auditoria.estado, 'cerrada'),
            eq(programaAuditoria.organizacionId, user.organizacionId),
          ),
        );
      for (const row of closed) {
        await this.drafts.ensureFor(row.id, user.organizacionId);
      }
    }
    const available = await this.reader.list(user, role);
    const preferred = available.find((item) => preferredStates.includes(item.estado));
    return (preferred ?? available[0])?.id;
  }
}

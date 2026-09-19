import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, distribucionInforme, informe, informeAcuse, proceso, programaAuditoria, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { InformeAccess, type InformeViewer } from '@informes-rules-informe/informe-access.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';

export interface InformeResumen {
  id: string;
  auditoriaId: string;
  titulo: string;
  estado: string;
  fechaEmision: string | null;
  aprobado: boolean;
}

export interface AcuseResult {
  id: string;
  leidoEn: string;
  yaRegistrado: boolean;
}

@Injectable()
export class InformeReadService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: InformeLoaderService,
    private readonly drafts: InformeDraftService,
    private readonly versions: RecordVersionService,
  ) {}

  async viewerFor(user: TokenPayload, role: SessionRole): Promise<InformeViewer> {
    const owned = await this.db.select({ id: proceso.id }).from(proceso).where(eq(proceso.duenoUsuarioId, user.sub));
    const [self] = await this.db.select({ procesoId: usuario.procesoId }).from(usuario).where(eq(usuario.id, user.sub));
    const processIds = [...owned.map((row) => row.id), ...(self?.procesoId ? [self.procesoId] : [])];
    return { userId: user.sub, role, processIds };
  }

  async get(informeId: string, user: TokenPayload, role: SessionRole): Promise<InformeDetalle> {
    const detail = await this.loader.detail(informeId, user.organizacionId);
    const viewer = await this.viewerFor(user, role);
    if (!InformeAccess.canRead(detail, viewer)) {
      throw new ForbiddenException('No tiene acceso a este informe.');
    }
    return detail;
  }

  async list(user: TokenPayload, role: SessionRole, auditoriaId?: string): Promise<InformeResumen[]> {
    if (auditoriaId !== undefined) {
      await this.drafts.ensureFor(auditoriaId, user.organizacionId);
    }
    const rows = await this.db
      .select({ id: informe.id })
      .from(informe)
      .innerJoin(auditoria, eq(informe.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(
        and(
          eq(programaAuditoria.organizacionId, user.organizacionId),
          auditoriaId === undefined ? undefined : eq(informe.auditoriaId, auditoriaId),
        ),
      )
      .orderBy(desc(informe.fechaEmision), desc(informe.id));

    const viewer = await this.viewerFor(user, role);
    const summaries: InformeResumen[] = [];
    for (const row of rows) {
      const detail = await this.loader.detail(row.id, user.organizacionId);
      if (InformeAccess.canRead(detail, viewer)) {
        summaries.push({
          id: detail.id,
          auditoriaId: detail.auditoriaId,
          titulo: detail.titulo,
          estado: detail.estado,
          fechaEmision: detail.fechaEmision,
          aprobado: detail.aprobadoPorId !== null,
        });
      }
    }
    return summaries;
  }

  async acknowledge(informeId: string, user: TokenPayload, role: SessionRole): Promise<AcuseResult> {
    const viewer = await this.viewerFor(user, role);
    return this.db.transaction(async (tx) => {
      const detail = await this.loader.detail(informeId, user.organizacionId, tx);
      if (!InformeAccess.canAcknowledge(detail, viewer)) {
        throw new ForbiddenException('Solo la alta dirección puede acusar recibo de un informe ya distribuido.');
      }

      const [created] = await tx
        .insert(informeAcuse)
        .values({ informeId, usuarioId: user.sub })
        .onConflictDoNothing()
        .returning({ leidoEn: informeAcuse.leidoEn });
      if (created === undefined) {
        const [previous] = await tx
          .select({ leidoEn: informeAcuse.leidoEn })
          .from(informeAcuse)
          .where(and(eq(informeAcuse.informeId, informeId), eq(informeAcuse.usuarioId, user.sub)));
        return { id: informeId, leidoEn: (previous?.leidoEn ?? new Date()).toISOString(), yaRegistrado: true };
      }

      await tx
        .update(distribucionInforme)
        .set({ leido: true })
        .where(and(eq(distribucionInforme.informeId, informeId), eq(distribucionInforme.usuarioId, user.sub)));
      await this.versions.record(
        {
          entidadTipo: 'informe',
          entidadId: informeId,
          creadoPorId: user.sub,
          contenido: { evento: 'acuse_de_lectura', usuarioId: user.sub, leidoEn: created.leidoEn.toISOString() },
        },
        tx,
      );
      return { id: informeId, leidoEn: created.leidoEn.toISOString(), yaRegistrado: false };
    });
  }
}

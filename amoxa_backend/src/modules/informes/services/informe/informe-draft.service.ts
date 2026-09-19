import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, informe, programaAuditoria } from '@schemas/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { InformeContentBuilder } from '@informes-rules-informe/informe-content-builder.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';

export interface DraftResult {
  informeId: string;
  created: boolean;
}

@Injectable()
export class InformeDraftService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: InformeLoaderService,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async ensureFor(auditoriaId: string, organizacionId: string): Promise<DraftResult | null> {
    const [owned] = await this.db
      .select({ id: auditoria.id, estado: auditoria.estado, liderId: auditoria.liderId })
      .from(auditoria)
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(and(eq(auditoria.id, auditoriaId), eq(programaAuditoria.organizacionId, organizacionId)));
    if (owned === undefined) {
      throw new NotFoundException('Auditoría no encontrada');
    }

    const existing = await this.loader.findIdByAuditoria(auditoriaId, organizacionId);
    if (existing !== undefined) {
      return { informeId: existing, created: false };
    }
    if (owned.estado !== 'cerrada' && owned.estado !== 'finalizada') {
      return null;
    }

    const hallazgos = await this.loader.hallazgosOf(auditoriaId);
    const gradoConformidad = InformeContentBuilder.conformity(hallazgos);
    const conclusiones = InformeContentBuilder.suggestedConclusions(hallazgos);

    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(informe)
        .values({
          auditoriaId,
          conclusiones,
          gradoConformidad,
          declaracionMuestreo: InformeContentBuilder.SAMPLING_STATEMENT,
        })
        .onConflictDoNothing({ target: informe.auditoriaId })
        .returning({ id: informe.id });

      if (inserted === undefined) {
        const current = await this.loader.findIdByAuditoria(auditoriaId, organizacionId, tx);
        return { informeId: current as string, created: false };
      }

      await this.versions.record(
        {
          entidadTipo: 'informe',
          entidadId: inserted.id,
          creadoPorId: owned.liderId,
          contenido: { auditoriaId, conclusiones, gradoConformidad, estado: 'borrador' },
        },
        tx,
      );
      await this.notifications.notifyUsers(
        [owned.liderId],
        {
          tipo: 'informe_borrador',
          titulo: 'Borrador de informe listo',
          mensaje: 'La auditoría se cerró y el sistema generó el borrador del informe. Revise las conclusiones y fírmelo.',
          entidadTipo: 'informe',
          entidadId: inserted.id,
        },
        tx,
      );
      return { informeId: inserted.id, created: true };
    });
  }
}

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { accion, accionReporteCierre, equipoAuditoria, hallazgo, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { ActionTransitions } from '@acciones-rules-action/action-transitions.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';
import { AccionEvidenceStore } from '@acciones-services-accion/accion-evidence-store.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import type { CierreAccionInput } from '@validators-acciones/cierre-accion.schema.js';

export interface CierreResult {
  id: string;
  estado: string;
  fechaCierre: string;
  evidencias: number;
}

@Injectable()
export class AccionClosureService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: AccionLoaderService,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async report(accionId: string, user: TokenPayload, input: CierreAccionInput, now: Date = new Date()): Promise<CierreResult> {
    return this.db.transaction(async (tx) => {
      const detail = await this.loader.detail(accionId, user.organizacionId, now, tx);
      if (detail.responsableId !== user.sub) {
        throw new ForbiddenException('Solo el responsable de la acción puede reportar su cierre.');
      }
      ActionTransitions.assertCanReport(detail.estado, input.evidencias.length);

      const fechaCierre = DeadlineCalculator.today(now);
      await tx.insert(accionReporteCierre).values({
        accionId,
        ciclo: detail.ciclo,
        reportadoPorId: user.sub,
        comentario: input.comentario_cierre ?? null,
      });
      await AccionEvidenceStore.insert(tx, accionId, 'cierre', detail.ciclo, input.evidencias, user.sub);
      await tx.update(accion).set({ estado: 'completada', fechaCierre, verificacionEficacia: 'pendiente' }).where(eq(accion.id, accionId));
      await tx.update(hallazgo).set({ estado: 'en_verificacion' }).where(eq(hallazgo.id, detail.hallazgo.id));

      await this.versions.record(
        {
          entidadTipo: 'accion',
          entidadId: accionId,
          creadoPorId: user.sub,
          contenido: {
            estado: 'reportada',
            fechaCierre,
            ciclo: detail.ciclo,
            comentario: input.comentario_cierre ?? null,
            evidencias: input.evidencias,
          },
        },
        tx,
      );

      const verifiers = await this.verifiers(detail.hallazgo.auditoriaId, detail.responsableId, user.organizacionId, tx);
      await this.notifications.notifyUsers(
        verifiers,
        {
          tipo: 'accion_por_verificar',
          titulo: 'Acción por verificar',
          mensaje: 'Una acción correctiva fue reportada como ejecutada y espera la verificación de su eficacia.',
          entidadTipo: 'accion',
          entidadId: accionId,
        },
        tx,
      );
      return { id: accionId, estado: 'reportada', fechaCierre, evidencias: input.evidencias.length };
    });
  }

  private async verifiers(auditoriaId: string, responsableId: string, organizacionId: string, executor: DbExecutor): Promise<string[]> {
    const team = await executor
      .select({ id: equipoAuditoria.auditorId })
      .from(equipoAuditoria)
      .where(and(eq(equipoAuditoria.auditoriaId, auditoriaId), ne(equipoAuditoria.auditorId, responsableId), isNull(equipoAuditoria.retiradoEn)));
    if (team.length > 0) {
      return team.map((row) => row.id);
    }
    const auditors = await executor
      .select({ id: usuario.id })
      .from(usuario)
      .where(and(eq(usuario.organizacionId, organizacionId), eq(usuario.rol, 'auditor'), ne(usuario.id, responsableId)));
    return auditors.map((row) => row.id);
  }
}

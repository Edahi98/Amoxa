import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { accion, accionAlerta, auditoria, hallazgo, programaAuditoria } from '@schemas/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { AlertaTipo } from '@acciones-rules-accion/accion.types.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';

export interface AlertRunSummary {
  previa7: number;
  previa1: number;
  vencidas: number;
}

@Injectable()
export class ExpirationAlertService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async run(now: Date = new Date()): Promise<AlertRunSummary> {
    const summary: AlertRunSummary = { previa7: 0, previa1: 0, vencidas: 0 };
    const rows = await this.db
      .select({
        id: accion.id,
        responsableId: accion.responsableId,
        fechaLimite: accion.fechaLimite,
        organizacionId: programaAuditoria.organizacionId,
      })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(and(inArray(accion.estado, ['pendiente', 'en_progreso']), isNotNull(accion.fechaLimite)));

    for (const row of rows) {
      const fechaLimite = row.fechaLimite as string;
      const days = DeadlineCalculator.daysLeft(fechaLimite, now);
      const tipo = DeadlineCalculator.alertFor(days);
      if (tipo === null) {
        continue;
      }
      await this.db.transaction(async (tx) => {
        if (tipo === 'vencida') {
          await tx.update(accion).set({ estado: 'vencida' }).where(eq(accion.id, row.id));
        }
        const [created] = await tx
          .insert(accionAlerta)
          .values({ accionId: row.id, tipo, fechaLimite })
          .onConflictDoNothing()
          .returning({ tipo: accionAlerta.tipo });
        if (created === undefined) {
          return;
        }
        await this.notify(tipo, row.id, row.responsableId, row.organizacionId, fechaLimite, tx);
        if (tipo === 'vencida') {
          await this.versions.record(
            { entidadTipo: 'accion', entidadId: row.id, creadoPorId: row.responsableId, contenido: { estado: 'vencida', fechaLimite } },
            tx,
          );
          summary.vencidas += 1;
        } else if (tipo === 'previa_1') {
          summary.previa1 += 1;
        } else {
          summary.previa7 += 1;
        }
      });
    }
    return summary;
  }

  private async notify(
    tipo: AlertaTipo,
    accionId: string,
    responsableId: string,
    organizacionId: string,
    fechaLimite: string,
    executor: DbExecutor,
  ): Promise<void> {
    const entity = { entidadTipo: 'accion', entidadId: accionId };
    if (tipo === 'vencida') {
      const notice = {
        tipo: 'accion_vencida',
        titulo: 'Acción vencida',
        mensaje: `La acción correctiva venció el ${fechaLimite} sin reportarse como ejecutada.`,
        ...entity,
      };
      await this.notifications.notifyUsers([responsableId], notice, executor);
      await this.notifications.notifyRole(organizacionId, 'gestor', notice, executor);
      return;
    }
    const dias = tipo === 'previa_1' ? 'un día' : 'siete días';
    await this.notifications.notifyUsers(
      [responsableId],
      {
        tipo: tipo === 'previa_1' ? 'accion_vence_1' : 'accion_vence_7',
        titulo: 'Acción próxima a vencer',
        mensaje: `Su acción correctiva vence el ${fechaLimite}: quedan como máximo ${dias}.`,
        ...entity,
      },
      executor,
    );
  }
}

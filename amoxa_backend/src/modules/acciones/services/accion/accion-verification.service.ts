import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { accion, accionVerificacion, hallazgo } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { ActionTransitions } from '@acciones-rules-action/action-transitions.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';
import { VerifierEligibility } from '@acciones-rules/verifier-eligibility.js';
import { AccionEvidenceStore } from '@acciones-services-accion/accion-evidence-store.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import type { VerificacionAccionInput } from '@validators-acciones/verificacion-accion.schema.js';

export interface VerificacionResult {
  id: string;
  eficaz: boolean;
  estado: string;
  hallazgoEstado: string;
  fechaLimite: string | null;
}

@Injectable()
export class AccionVerificationService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: AccionLoaderService,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async verify(accionId: string, user: TokenPayload, input: VerificacionAccionInput, now: Date = new Date()): Promise<VerificacionResult> {
    return this.decide(accionId, user, input, input.eficaz !== false, now);
  }

  async reopen(accionId: string, user: TokenPayload, input: VerificacionAccionInput, now: Date = new Date()): Promise<VerificacionResult> {
    return this.decide(accionId, user, input, false, now);
  }

  private async decide(
    accionId: string,
    user: TokenPayload,
    input: VerificacionAccionInput,
    eficaz: boolean,
    now: Date,
  ): Promise<VerificacionResult> {
    return this.db.transaction(async (tx) => {
      const detail = await this.loader.detail(accionId, user.organizacionId, now, tx);
      VerifierEligibility.assertEligible(user.sub, detail.responsableId);
      ActionTransitions.assertCanVerify(detail.estado, input.evidencias.length);

      const nuevaFecha = input.nueva_fecha ?? null;
      if (!eficaz) {
        if (nuevaFecha === null) {
          throw new UnprocessableEntityException('Una acción no eficaz se reabre con una nueva fecha límite.');
        }
        DeadlineCalculator.assertNotPast(nuevaFecha, now);
      }

      await tx.insert(accionVerificacion).values({
        accionId,
        ciclo: detail.ciclo,
        verificadorId: user.sub,
        eficaz,
        comentario: input.comentario ?? null,
        nuevaFecha: eficaz ? null : nuevaFecha,
      });
      await AccionEvidenceStore.insert(tx, accionId, 'verificacion', detail.ciclo, input.evidencias, user.sub);

      let hallazgoEstado: 'cerrado' | 'abierto';
      if (eficaz) {
        await tx.update(accion).set({ verificacionEficacia: 'ok', verificadoPorId: user.sub }).where(eq(accion.id, accionId));
        hallazgoEstado = 'cerrado';
      } else {
        await tx
          .update(accion)
          .set({
            estado: 'pendiente',
            fechaLimite: nuevaFecha,
            fechaCierre: null,
            verificacionEficacia: 'no_ok',
            verificadoPorId: user.sub,
          })
          .where(eq(accion.id, accionId));
        hallazgoEstado = 'abierto';
      }
      await tx.update(hallazgo).set({ estado: hallazgoEstado }).where(eq(hallazgo.id, detail.hallazgo.id));

      await this.versions.record(
        {
          entidadTipo: 'accion',
          entidadId: accionId,
          creadoPorId: user.sub,
          contenido: {
            estado: eficaz ? 'verificada' : 'reabierta',
            eficaz,
            ciclo: detail.ciclo,
            comentario: input.comentario ?? null,
            nuevaFecha,
            evidencias: input.evidencias,
          },
        },
        tx,
      );
      await this.notifications.notifyUsers(
        [detail.responsableId],
        eficaz
          ? {
              tipo: 'accion_verificada',
              titulo: 'Acción verificada como eficaz',
              mensaje: 'La verificación declaró eficaz su acción correctiva; la no conformidad quedó cerrada.',
              entidadTipo: 'accion',
              entidadId: accionId,
            }
          : {
              tipo: 'accion_reabierta',
              titulo: 'Acción reabierta',
              mensaje: `La verificación declaró que la acción no fue eficaz. Nueva fecha límite: ${nuevaFecha}.`,
              entidadTipo: 'accion',
              entidadId: accionId,
            },
        tx,
      );
      return {
        id: accionId,
        eficaz,
        estado: eficaz ? 'verificada' : 'reabierta',
        hallazgoEstado,
        fechaLimite: eficaz ? detail.fechaLimite : nuevaFecha,
      };
    });
  }
}

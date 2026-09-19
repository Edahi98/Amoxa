import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { informe } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { InformeTransitions } from '@informes-rules-informe/informe-transitions.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';

export interface AprobacionResult {
  id: string;
  aprobadoPorId: string;
}

@Injectable()
export class InformeApprovalService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: InformeLoaderService,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async approve(informeId: string, user: TokenPayload): Promise<AprobacionResult> {
    return this.db.transaction(async (tx) => {
      const detail = await this.loader.detail(informeId, user.organizacionId, tx);
      InformeTransitions.assertCanApprove(detail.estado);
      if (detail.aprobadoPorId !== null) {
        throw new ConflictException('El informe ya fue aprobado por la gestión.');
      }

      await tx.update(informe).set({ aceptadoPorId: user.sub }).where(eq(informe.id, informeId));
      await this.versions.record(
        {
          entidadTipo: 'informe',
          entidadId: informeId,
          creadoPorId: user.sub,
          contenido: { evento: 'aprobacion_gestion', aprobadoPorId: user.sub, huella: detail.firma?.huella ?? null },
        },
        tx,
      );
      await this.notifications.notifyUsers(
        [detail.liderId],
        {
          tipo: 'informe_aprobado',
          titulo: 'Informe aprobado por la gestión',
          mensaje: `La gestión aprobó el ${detail.titulo}.`,
          entidadTipo: 'informe',
          entidadId: informeId,
        },
        tx,
      );
      return { id: informeId, aprobadoPorId: user.sub };
    });
  }
}

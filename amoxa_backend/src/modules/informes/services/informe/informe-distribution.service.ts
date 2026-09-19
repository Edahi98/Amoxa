import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import type { DbRole } from '@auth-roles/role-mapper.js';
import { auditoria, distribucionInforme, proceso, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { DistributionRules } from '@informes-rules/distribution-rules.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';
import { InformeLeaderGuard } from '@informes-rules-informe/informe-leader-guard.js';
import { InformeTransitions } from '@informes-rules-informe/informe-transitions.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';

export interface DestinatarioOpcion {
  id: string;
  nombre: string;
  rol: DbRole;
}

export interface DistribucionResult {
  id: string;
  estado: string;
  destinatarios: number;
}

@Injectable()
export class InformeDistributionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: InformeLoaderService,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async candidates(detail: InformeDetalle, executor: DbExecutor = this.db): Promise<DestinatarioOpcion[]> {
    const audited =
      detail.procesoIds.length === 0
        ? undefined
        : or(inArray(usuario.procesoId, detail.procesoIds), inArray(usuario.id, this.ownersOf(detail.procesoIds)));
    const scope = audited === undefined ? undefined : and(eq(usuario.rol, 'auditado'), audited);
    const rows = await executor
      .select({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol })
      .from(usuario)
      .where(
        and(
          eq(usuario.organizacionId, detail.organizacionId),
          scope === undefined ? inArray(usuario.rol, ['admin', 'gestor_programa']) : or(inArray(usuario.rol, ['admin', 'gestor_programa']), scope),
        ),
      )
      .orderBy(asc(usuario.nombre));
    return rows;
  }

  async distribute(informeId: string, user: TokenPayload, destinatarioIds: readonly string[]): Promise<DistribucionResult> {
    return this.db.transaction(async (tx) => {
      const detail = await this.loader.detail(informeId, user.organizacionId, tx);
      InformeLeaderGuard.assertLeader(detail.liderId, user.sub);
      InformeTransitions.assertCanDistribute(detail.estado);

      const ids = [...new Set(destinatarioIds)];
      const recipients = await tx
        .select({ id: usuario.id, rol: usuario.rol })
        .from(usuario)
        .where(and(eq(usuario.organizacionId, user.organizacionId), inArray(usuario.id, ids)));
      if (recipients.length !== ids.length) {
        throw new UnprocessableEntityException('Algún destinatario no existe en su organización.');
      }
      DistributionRules.assertValid(recipients);

      await tx.insert(distribucionInforme).values(ids.map((usuarioId) => ({ informeId, usuarioId })));
      await tx.update(auditoria).set({ estado: 'finalizada' }).where(eq(auditoria.id, detail.auditoriaId));
      await this.versions.record(
        {
          entidadTipo: 'informe',
          entidadId: informeId,
          creadoPorId: user.sub,
          contenido: { estado: 'distribuido', destinatarios: ids, huella: detail.firma?.huella ?? null },
        },
        tx,
      );
      await this.notifications.notifyUsers(
        ids,
        {
          tipo: 'informe_distribuido',
          titulo: 'Informe de auditoría disponible',
          mensaje: `Se distribuyó el ${detail.titulo}. Léalo y acuse recibo.`,
          entidadTipo: 'informe',
          entidadId: informeId,
        },
        tx,
      );
      return { id: informeId, estado: 'distribuido', destinatarios: ids.length };
    });
  }

  private ownersOf(procesoIds: readonly string[]) {
    return this.db.select({ id: proceso.duenoUsuarioId }).from(proceso).where(inArray(proceso.id, [...procesoIds]));
  }
}

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { passwordRequest, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { SolicitudHierarchy } from '@solicitudes-services-solicitud/solicitud-hierarchy.js';
import { SolicitudIssuerService, type IssuedLink } from '@solicitudes-services-solicitud/solicitud-issuer.service.js';

@Injectable()
export class SolicitudDecisionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly issuer: SolicitudIssuerService,
    private readonly log: SecurityLogService,
  ) {}

  public async approve(
    requestId: string,
    actorId: string,
    actorRole: SessionRole,
    ip: string | null,
    now: Date = new Date(),
  ): Promise<IssuedLink> {
    return this.db.transaction(async (tx) => {
      const target = await this.lockPending(requestId, tx);
      SolicitudHierarchy.assertCanHandle(actorRole, target.rol);
      if (!target.activo) {
        throw new ConflictException('La solicitud ya no es válida');
      }

      const link = await this.issuer.approvePending(requestId, target.usuarioId, actorId, tx, now);
      await this.log.record(
        { actorId, action: AuditActions.PASSWORD_REQUEST_APPROVED, targetId: target.usuarioId, metadata: { requestId }, ip },
        tx,
      );
      return link;
    });
  }

  public async reject(
    requestId: string,
    actorId: string,
    actorRole: SessionRole,
    ip: string | null,
    now: Date = new Date(),
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const target = await this.lockPending(requestId, tx);
      SolicitudHierarchy.assertCanHandle(actorRole, target.rol);

      await tx
        .update(passwordRequest)
        .set({ status: 'rejected', tokenHash: null, handledBy: actorId, handledAt: now })
        .where(eq(passwordRequest.id, requestId));
      await this.log.record(
        { actorId, action: AuditActions.PASSWORD_REQUEST_REJECTED, targetId: target.usuarioId, metadata: { requestId }, ip },
        tx,
      );
    });
  }

  private async lockPending(requestId: string, tx: DbExecutor) {
    const [request] = await tx
      .select({ usuarioId: passwordRequest.usuarioId })
      .from(passwordRequest)
      .where(and(eq(passwordRequest.id, requestId), eq(passwordRequest.status, 'pending')))
      .for('update');
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const [target] = await tx
      .select({ rol: usuario.rol, activo: usuario.activo })
      .from(usuario)
      .where(eq(usuario.id, request.usuarioId))
      .limit(1);
    if (!target) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return { usuarioId: request.usuarioId, rol: target.rol, activo: target.activo };
  }
}

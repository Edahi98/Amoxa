import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { passwordRequest, usuario } from '@schemas/index.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';

@Injectable()
export class SolicitudRequestService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly log: SecurityLogService,
  ) {}

  public async submit(email: string, ip: string | null): Promise<void> {
    const [target] = await this.db
      .select({ id: usuario.id, rol: usuario.rol, activo: usuario.activo })
      .from(usuario)
      .where(eq(usuario.email, email))
      .limit(1);
    if (!target || !target.activo || target.rol === 'superusuario') {
      return;
    }

    const [created] = await this.db
      .insert(passwordRequest)
      .values({ usuarioId: target.id, type: 'reset', status: 'pending', requestedIp: ip })
      .onConflictDoNothing()
      .returning({ id: passwordRequest.id });
    if (created) {
      await this.log.record({ actorId: null, action: AuditActions.PASSWORD_REQUEST_CREATED, targetId: target.id, ip });
    }
  }
}

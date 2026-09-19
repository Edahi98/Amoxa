import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { passwordRequest, usuario } from '@schemas/index.js';
import { TokenService } from '@auth-token/token.service.js';
import { SecretToken } from '@common-security/secret-token.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';

@Injectable()
export class SolicitudResetService {
  private static readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly tokens: TokenService,
    private readonly log: SecurityLogService,
  ) {}

  public async complete(rawToken: string, password: string, ip: string | null, now: Date = new Date()): Promise<void> {
    const tokenHash = SecretToken.hash(rawToken);
    const [candidate] = await this.db
      .select({ id: passwordRequest.id, tokenHash: passwordRequest.tokenHash, expiresAt: passwordRequest.expiresAt })
      .from(passwordRequest)
      .where(and(eq(passwordRequest.tokenHash, tokenHash), eq(passwordRequest.status, 'approved')))
      .limit(1);
    if (!candidate || !SecretToken.matches(candidate.tokenHash, rawToken)) {
      throw SolicitudResetService.invalid();
    }
    if (candidate.expiresAt === null || candidate.expiresAt.getTime() <= now.getTime()) {
      await this.db
        .update(passwordRequest)
        .set({ status: 'expired', tokenHash: null })
        .where(and(eq(passwordRequest.id, candidate.id), eq(passwordRequest.status, 'approved')));
      throw SolicitudResetService.invalid();
    }

    const passwordHash = await bcrypt.hash(password, SolicitudResetService.BCRYPT_SALT_ROUNDS);

    await this.db.transaction(async (tx) => {
      const [request] = await tx
        .select({ usuarioId: passwordRequest.usuarioId, type: passwordRequest.type, tokenHash: passwordRequest.tokenHash })
        .from(passwordRequest)
        .where(and(eq(passwordRequest.id, candidate.id), eq(passwordRequest.status, 'approved')))
        .for('update');
      if (!request || !SecretToken.matches(request.tokenHash, rawToken)) {
        throw SolicitudResetService.invalid();
      }

      const [target] = await tx
        .select({ id: usuario.id, rol: usuario.rol, activo: usuario.activo })
        .from(usuario)
        .where(eq(usuario.id, request.usuarioId))
        .limit(1);
      const isInvite = request.type === 'invite';
      if (!target || target.rol === 'superusuario' || (!isInvite && !target.activo)) {
        throw SolicitudResetService.invalid();
      }

      await tx
        .update(usuario)
        .set(isInvite ? { passwordHash, activo: true } : { passwordHash })
        .where(eq(usuario.id, target.id));
      await tx
        .update(passwordRequest)
        .set({ status: 'used', tokenHash: null })
        .where(eq(passwordRequest.id, candidate.id));
      await this.tokens.revokeAllFor(target.id, tx);
      await this.log.record(
        {
          actorId: target.id,
          action: AuditActions.PASSWORD_RESET_COMPLETED,
          targetId: target.id,
          metadata: { requestId: candidate.id, type: request.type },
          ip,
        },
        tx,
      );
    });
  }

  private static invalid(): BadRequestException {
    return new BadRequestException('Enlace inválido o expirado');
  }
}

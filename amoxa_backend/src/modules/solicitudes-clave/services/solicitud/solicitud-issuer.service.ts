import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { passwordRequest } from '@schemas/index.js';
import { SecretToken } from '@common-security/secret-token.js';
import { SolicitudLifetimes } from '@solicitudes-services-solicitud/solicitud-lifetimes.js';
import { SolicitudUrl } from '@solicitudes-services-solicitud/solicitud-url.js';

export interface IssuedLink {
  url: string;
  expiresAt: Date;
}

@Injectable()
export class SolicitudIssuerService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async issueInvite(
    usuarioId: string,
    actorId: string,
    executor: DbExecutor = this.db,
    now: Date = new Date(),
  ): Promise<IssuedLink> {
    await this.invalidateApproved(usuarioId, executor);
    const raw = SecretToken.generate();
    const expiresAt = new Date(now.getTime() + SolicitudLifetimes.INVITE_MS);
    await executor.insert(passwordRequest).values({
      usuarioId,
      type: 'invite',
      status: 'approved',
      tokenHash: SecretToken.hash(raw),
      expiresAt,
      handledBy: actorId,
      handledAt: now,
    });
    return { url: SolicitudUrl.build(raw), expiresAt };
  }

  public async approvePending(
    requestId: string,
    usuarioId: string,
    actorId: string,
    executor: DbExecutor = this.db,
    now: Date = new Date(),
  ): Promise<IssuedLink> {
    await this.invalidateApproved(usuarioId, executor);
    const raw = SecretToken.generate();
    const expiresAt = new Date(now.getTime() + SolicitudLifetimes.RESET_MS);
    await executor
      .update(passwordRequest)
      .set({ status: 'approved', tokenHash: SecretToken.hash(raw), expiresAt, handledBy: actorId, handledAt: now })
      .where(eq(passwordRequest.id, requestId));
    return { url: SolicitudUrl.build(raw), expiresAt };
  }

  private async invalidateApproved(usuarioId: string, executor: DbExecutor): Promise<void> {
    await executor
      .update(passwordRequest)
      .set({ status: 'expired', tokenHash: null })
      .where(and(eq(passwordRequest.usuarioId, usuarioId), eq(passwordRequest.status, 'approved')));
  }
}

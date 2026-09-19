import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { and, eq, lt, or } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { passwordRequest } from '@schemas/index.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { SolicitudLifetimes } from '@solicitudes-services-solicitud/solicitud-lifetimes.js';

@Injectable()
export class SolicitudExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SolicitudExpirationService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly log: SecurityLogService,
  ) {}

  public onModuleInit(): void {
    this.timer = setInterval(() => {
      this.expireOverdue().catch((error: unknown) => this.logger.error(String(error)));
    }, SolicitudLifetimes.SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  public onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async expireOverdue(now: Date = new Date()): Promise<number> {
    const pendingLimit = new Date(now.getTime() - SolicitudLifetimes.PENDING_MS);
    const expired = await this.db
      .update(passwordRequest)
      .set({ status: 'expired', tokenHash: null })
      .where(
        or(
          and(eq(passwordRequest.status, 'approved'), lt(passwordRequest.expiresAt, now)),
          and(eq(passwordRequest.status, 'pending'), lt(passwordRequest.createdAt, pendingLimit)),
        ),
      )
      .returning({ id: passwordRequest.id });

    if (expired.length > 0) {
      await this.log.record({ action: AuditActions.PASSWORD_REQUESTS_EXPIRED, metadata: { count: expired.length } });
    }
    return expired.length;
  }
}

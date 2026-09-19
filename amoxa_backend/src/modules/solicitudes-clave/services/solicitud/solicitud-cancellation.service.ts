import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { passwordRequest } from '@schemas/index.js';

@Injectable()
export class SolicitudCancellationService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async cancelOpenFor(
    usuarioId: string,
    actorId: string,
    executor: DbExecutor = this.db,
    now: Date = new Date(),
  ): Promise<number> {
    const cancelled = await executor
      .update(passwordRequest)
      .set({ status: 'rejected', tokenHash: null, handledBy: actorId, handledAt: now })
      .where(and(eq(passwordRequest.usuarioId, usuarioId), inArray(passwordRequest.status, ['pending', 'approved'])))
      .returning({ id: passwordRequest.id });
    return cancelled.length;
  }
}

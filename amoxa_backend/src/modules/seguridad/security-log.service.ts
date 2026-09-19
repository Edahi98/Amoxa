import { Inject, Injectable } from '@nestjs/common';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { auditLog } from '@schemas/index.js';

export interface SecurityLogEntry {
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

@Injectable()
export class SecurityLogService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async record(entry: SecurityLogEntry, executor: DbExecutor = this.db): Promise<void> {
    await executor.insert(auditLog).values({
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ip: entry.ip ?? null,
    });
  }
}

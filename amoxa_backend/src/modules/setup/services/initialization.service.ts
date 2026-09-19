import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { systemState } from '@schemas/index.js';

@Injectable()
export class InitializationService {
  private initialized = false;

  constructor(@Inject(DB) private readonly db: Db) {}

  public async isInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    const [row] = await this.db
      .select({ initialized: systemState.initialized })
      .from(systemState)
      .where(eq(systemState.id, 1))
      .limit(1);
    this.initialized = row?.initialized === true;
    return this.initialized;
  }

  public markInitialized(): void {
    this.initialized = true;
  }
}

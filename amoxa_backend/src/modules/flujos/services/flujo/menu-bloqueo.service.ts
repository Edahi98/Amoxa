import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { usuario } from '@schemas/index.js';

@Injectable()
export class MenuBloqueoService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async isLocked(userId: string): Promise<boolean> {
    const [row] = await this.db.select({ locked: usuario.menuBloqueado }).from(usuario).where(eq(usuario.id, userId)).limit(1);
    return row?.locked ?? true;
  }

  public async setLocked(userId: string, locked: boolean): Promise<{ bloqueo: boolean }> {
    await this.db.update(usuario).set({ menuBloqueado: locked }).where(eq(usuario.id, userId));
    return { bloqueo: locked };
  }
}

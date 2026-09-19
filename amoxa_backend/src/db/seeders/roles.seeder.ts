import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { rol } from '@schemas/index.js';
import { ROLES } from '@shared/roles.js';

@Injectable()
export class RolesSeeder implements OnApplicationBootstrap {
  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<string[]> {
    const existing = await this.db.select({ clave: rol.clave }).from(rol);
    const present = new Set(existing.map((row) => row.clave));

    const missing = Object.entries(ROLES)
      .filter(([clave]) => !present.has(clave))
      .map(([clave, definition]) => ({ clave, codigo: definition.code, nombre: definition.label }));

    if (missing.length === 0) {
      return [];
    }

    await this.db.insert(rol).values(missing).onConflictDoNothing({ target: rol.clave });
    return missing.map((row) => row.clave);
  }
}

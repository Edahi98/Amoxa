import { organizacion, usuario } from '@db/schema/index.js';
import type { TestDatabase } from '@testing-database/test-database.js';

export type SeedRole = 'admin' | 'gestor_programa' | 'lider_auditor' | 'auditor' | 'auditado' | 'superusuario' | 'administrador';

export interface SeededUser {
  id: string;
  organizacionId: string;
  rol: SeedRole;
}

export class TestSeed {
  public static async organizacion(database: TestDatabase, nombre = 'Organización de prueba'): Promise<string> {
    const [row] = await database.orm.insert(organizacion).values({ nombre }).returning({ id: organizacion.id });
    return row.id;
  }

  public static async usuario(
    database: TestDatabase,
    organizacionId: string,
    rol: SeedRole,
    email = `${rol}-${Math.random().toString(36).slice(2, 8)}@amoxa.test`,
  ): Promise<SeededUser> {
    const [row] = await database.orm
      .insert(usuario)
      .values({ organizacionId, nombre: `Usuario ${rol}`, email, passwordHash: 'hash-de-prueba', rol })
      .returning({ id: usuario.id });
    return { id: row.id, organizacionId, rol };
  }
}

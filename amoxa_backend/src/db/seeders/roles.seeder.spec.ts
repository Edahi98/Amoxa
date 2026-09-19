import { ROLES } from '@shared/roles.js';
import { RolesSeeder } from '@seeders/roles.seeder.js';

interface InsertedRow {
  clave: string;
  codigo: string;
  nombre: string;
}

class FakeDb {
  public readonly inserted: InsertedRow[] = [];
  private readonly existing: string[];

  constructor(existing: string[]) {
    this.existing = existing;
  }

  public select() {
    return { from: async () => this.existing.map((clave) => ({ clave })) };
  }

  public insert() {
    return {
      values: (rows: InsertedRow[]) => {
        this.inserted.push(...rows);
        return { onConflictDoNothing: async () => undefined };
      },
    };
  }
}

describe('RolesSeeder', () => {
  const allKeys = Object.keys(ROLES);

  it('inserta todos los roles cuando la tabla está vacía', async () => {
    const db = new FakeDb([]);

    const created = await new RolesSeeder(db as never).seed();

    expect(created).toEqual(allKeys);
    expect(db.inserted).toHaveLength(allKeys.length);
    expect(db.inserted[0]).toEqual({ clave: 'direccion', codigo: 'AD', nombre: 'Alta dirección' });
  });

  it('inserta solo los roles que faltan', async () => {
    const db = new FakeDb(['direccion', 'gestor', 'auditor']);

    const created = await new RolesSeeder(db as never).seed();

    expect(created).toEqual(['lider', 'dueno_proceso', 'sistema', 'administrador', 'superusuario']);
    expect(db.inserted.map((row) => row.clave)).toEqual(['lider', 'dueno_proceso', 'sistema', 'administrador', 'superusuario']);
  });

  it('no inserta nada cuando ya existen todos', async () => {
    const db = new FakeDb(allKeys);

    const created = await new RolesSeeder(db as never).seed();

    expect(created).toEqual([]);
    expect(db.inserted).toHaveLength(0);
  });
});

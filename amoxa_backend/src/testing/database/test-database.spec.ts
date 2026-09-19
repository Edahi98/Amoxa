import { organizacion } from '@db/schema/index.js';
import { TestDatabase } from '@testing-database/test-database.js';

describe('TestDatabase', () => {
  it('crea el esquema real en memoria y permite insertar y leer', async () => {
    const database = await TestDatabase.create();
    await database.orm.insert(organizacion).values({ nombre: 'Org de prueba' });
    const rows = await database.orm.select().from(organizacion);
    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe('Org de prueba');
    await database.close();
  }, 60000);
});

import { ContentHasher } from '@registros-versionado/content-hasher.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';

describe('RecordVersionService', () => {
  let database: TestDatabase;
  let service: RecordVersionService;
  let autorId: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    service = new RecordVersionService(database.db);
    const organizacionId = await TestSeed.organizacion(database);
    autorId = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('crea la versión 1 con la huella del contenido y suma versiones sin borrar las anteriores', async () => {
    const entidadId = '11111111-1111-4111-8111-111111111111';

    const first = await service.record({ entidadTipo: 'programa', entidadId, creadoPorId: autorId, contenido: { a: 1, b: 2 } });
    const second = await service.record({ entidadTipo: 'programa', entidadId, creadoPorId: autorId, contenido: { a: 2 } });
    const history = await service.history('programa', entidadId);

    expect(first.version).toBe(1);
    expect(first.hash).toBe(ContentHasher.sha256({ b: 2, a: 1 }));
    expect(second.version).toBe(2);
    expect(history.map((row) => row.version)).toEqual([2, 1]);
  });

  it('lleva versiones independientes por entidad', async () => {
    const result = await service.record({
      entidadTipo: 'informe',
      entidadId: '22222222-2222-4222-8222-222222222222',
      creadoPorId: autorId,
      contenido: 'x',
      confidencialidad: 'confidencial',
    });

    expect(result.version).toBe(1);
  });
});

describe('ContentHasher', () => {
  it('produce la misma huella sin importar el orden de las claves', () => {
    expect(ContentHasher.sha256({ a: 1, b: { c: 2, d: 3 } })).toBe(ContentHasher.sha256({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it('cambia cuando cambia el contenido', () => {
    expect(ContentHasher.sha256({ a: 1 })).not.toBe(ContentHasher.sha256({ a: 2 }));
  });
});

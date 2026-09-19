import { UnprocessableEntityException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { pregunta } from '@db/schema/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { OrdenBodySchema } from '@validators-plantillas/orden-body.schema.js';
import { PlantillaBodySchema } from '@validators-plantillas/plantilla-body.schema.js';
import { PreguntaBodySchema } from '@validators-plantillas/pregunta-body.schema.js';
import { SubirEvidenciaSchema } from '@validators-ejecucion/subir-evidencia.schema.js';
import { PlantillaQueryService } from '@plantillas-services-plantilla/plantilla-query.service.js';
import { PlantillasService } from '@plantillas-services/plantillas.service.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';

vi.setConfig({ testTimeout: 60000 });

const token = (user: SeededUser): TokenPayload => ({
  sub: user.id,
  organizacionId: user.organizacionId,
  email: `${user.rol}@amoxa.test`,
  rol: user.rol,
  issuedAt: '2026-01-01T00:00:00.000Z',
});

const question = (texto: string) =>
  PreguntaBodySchema.parse({ pregunta: { texto, clausula: '9.2', criterio: 'norma' } }) as Parameters<PlantillasService['addQuestion']>[2];

describe('orden de las preguntas', () => {
  let database: TestDatabase;
  let service: PlantillasService;
  let gestor: TokenPayload;
  let plantillaId: string;

  const order = async () =>
    (await database.db.select().from(pregunta).where(eq(pregunta.plantillaId, plantillaId)).orderBy(asc(pregunta.orden))).map((row) => row.texto);

  const ids = async () => (await database.db.select().from(pregunta).where(eq(pregunta.plantillaId, plantillaId)).orderBy(asc(pregunta.orden))).map((row) => row.id);

  beforeAll(async () => {
    database = await TestDatabase.create();
    const organizacionId = await TestSeed.organizacion(database);
    gestor = token(await TestSeed.usuario(database, organizacionId, 'gestor_programa'));
    service = new PlantillasService(database.db, new PlantillaQueryService(database.db), new RecordVersionService(database.db), new NotificationService(database.db));
    plantillaId = (await service.create(gestor, PlantillaBodySchema.parse({ plantilla: { nombre: 'Ordenable' } }) as { nombre: string })).id;
    for (const texto of ['Primera', 'Segunda', 'Tercera']) await service.addQuestion(plantillaId, gestor, question(texto));
  }, 60000);

  afterAll(() => database.close());

  it('guarda el nuevo orden y lo devuelve en la vista', async () => {
    const [first, second, third] = await ids();

    const view = await service.reorder(plantillaId, gestor, [third, first, second]);

    expect(await order()).toEqual(['Tercera', 'Primera', 'Segunda']);
    expect(view.preguntas.map((item) => item.texto)).toEqual(['Tercera', 'Primera', 'Segunda']);
  });

  it('rechaza listas incompletas, repetidas o con preguntas ajenas', async () => {
    const [first, second] = await ids();

    await expect(service.reorder(plantillaId, gestor, [first, second])).rejects.toThrow(UnprocessableEntityException);
    await expect(service.reorder(plantillaId, gestor, [first, first, second])).rejects.toThrow(UnprocessableEntityException);
    await expect(service.reorder(plantillaId, gestor, [first, second, crypto.randomUUID()])).rejects.toThrow(UnprocessableEntityException);
    expect(await order()).toEqual(['Tercera', 'Primera', 'Segunda']);
  });

  it('una plantilla sin preguntas no acepta un orden inventado', async () => {
    const other = (await service.create(gestor, PlantillaBodySchema.parse({ plantilla: { nombre: 'Otra' } }) as { nombre: string })).id;

    await expect(service.reorder(other, gestor, [crypto.randomUUID()])).rejects.toThrow(UnprocessableEntityException);
  });

  it('el cuerpo acepta los datos anidados bajo orden y exige identificadores válidos', () => {
    const id = crypto.randomUUID();

    expect(OrdenBodySchema.safeParse({ orden: { preguntas: [{ id, title: 'x' }] } }).success).toBe(true);
    expect(OrdenBodySchema.safeParse({ orden: { preguntas: [{ id: 'no-uuid' }] } }).success).toBe(false);
    expect(OrdenBodySchema.safeParse({ orden: { preguntas: [] } }).success).toBe(false);
  });
});

describe('código QR o de barras en la evidencia', () => {
  it('acepta códigos comunes y rechaza scripts, SQL y caracteres de control', () => {
    const parse = (codigo: string) => SubirEvidenciaSchema.safeParse({ evidencia: { codigo } }).success;

    expect(parse('EQ-001')).toBe(true);
    expect(parse('7501031311309')).toBe(true);
    expect(parse('https://amoxa.test/activo/42')).toBe(true);
    expect(parse('<script>alert(1)</script>')).toBe(false);
    expect(parse("x'; DROP TABLE usuario; --")).toBe(false);
    expect(parse('abcd')).toBe(false);
    expect(parse('a'.repeat(201))).toBe(false);
  });

  it('un código vacío se trata como sin código', () => {
    const parsed = SubirEvidenciaSchema.parse({ evidencia: { codigo: '' } });

    expect(parsed.evidencia?.codigo).toBeUndefined();
  });
});

describe('pantalla del editor', () => {
  it('la sección de orden solo se muestra con la plantilla en borrador', async () => {
    const { ScreenContextBuilder } = await import('@sdui-builder-screen/screen-context-builder.js');
    const { ScreenFactory } = await import('@sdui-definition-screen/screen-factory.js');
    await import('@screens/index.js');
    const screen = ScreenFactory.createById('plantilla.editar', ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' }));
    const json = JSON.stringify(screen.root);
    const start = json.indexOf('"id":"orden_seccion"');

    expect(start).toBeGreaterThan(-1);
    expect(json.slice(start, start + 1500)).toContain('entity.estado');
  });
});

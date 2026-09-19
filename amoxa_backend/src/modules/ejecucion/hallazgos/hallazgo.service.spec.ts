import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { hallazgo, informacionDocumentada } from '@db/schema/index.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';

describe('HallazgoService', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let scenario: EjecucionScenario;
  let dir: string;
  let sinEvidencia: string;
  let conEvidencia: string;

  const auditorUser = () => TokenFactory.of(scenario.auditor);
  const liderUser = () => TokenFactory.of(scenario.lider);

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-hallazgo-'));
    harness = new EjecucionHarness(database, dir);
    scenario = await EjecucionSeed.create(database);
    await harness.checklist.save(scenario.auditoriaId, auditorUser(), {
      respuestas: { q1: { result: 'no_conforme' }, q2: { result: 'no_conforme' } },
    });
    const view = await harness.checklist.view(scenario.auditoriaId, auditorUser());
    sinEvidencia = view.preguntas[0].respuesta!.id;
    conEvidencia = view.preguntas[1].respuesta!.id;
    await harness.evidence.storeDeclared(scenario.auditoriaId, conEvidencia, auditorUser(), {
      archivos: [{ id: 'e1', name: 'foto.png', size: 10, mimeType: 'image/png' }],
    });
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('no guarda una no conformidad sin cláusula y explica el motivo', async () => {
    await expect(
      harness.hallazgos.create(scenario.auditoriaId, auditorUser(), { tipo: 'nc_menor', respuesta_id: conEvidencia, descripcion: 'Falta control' }),
    ).rejects.toMatchObject({ status: 422, response: { code: expect.stringContaining('NC_SIN_CLAUSULA') } });
  });

  it('no guarda una no conformidad sin evidencia verificada', async () => {
    await expect(
      harness.hallazgos.create(scenario.auditoriaId, auditorUser(), { tipo: 'nc_mayor', respuesta_id: sinEvidencia, clausula: '7.5', descripcion: 'Sin registros' }),
    ).rejects.toMatchObject({ status: 422, response: { code: 'NC_SIN_EVIDENCIA_VERIFICADA', message: expect.stringContaining('evidencia verificada') } });

    await expect(
      harness.hallazgos.create(scenario.auditoriaId, auditorUser(), { tipo: 'nc_mayor', respuesta_id: conEvidencia, clausula: '7.5', descripcion: 'Evidencia sin verificar' }),
    ).rejects.toMatchObject({ status: 422, response: { code: 'NC_SIN_EVIDENCIA_VERIFICADA' } });
    expect(await database.orm.select().from(hallazgo)).toHaveLength(0);
  });

  it('guarda una no conformidad con cláusula y evidencia verificada y crea versión', async () => {
    await harness.evidence.verify(scenario.auditoriaId, conEvidencia, auditorUser());
    const created = await harness.hallazgos.create(scenario.auditoriaId, auditorUser(), {
      tipo: 'nc_mayor',
      respuesta_id: conEvidencia,
      clausula: '7.5',
      descripcion: 'La información documentada no se controla',
    });

    expect(created).toMatchObject({ kind: 'nc_mayor', tipo: 'NC', clasificacion: 'mayor', clausula: '7.5', evidenciasVerificadas: true, revisado: false, proceso: 'Compras' });
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, created.id));
    expect(versions).toHaveLength(1);
    expect(versions[0].creadoPorId).toBe(scenario.auditor.id);
  });

  it('permite observaciones y oportunidades sin evidencia ni cláusula', async () => {
    const observation = await harness.hallazgos.create(scenario.auditoriaId, auditorUser(), {
      tipo: 'observacion',
      respuesta_id: sinEvidencia,
      descripcion: 'Conviene digitalizar el registro',
    });
    const opportunity = await harness.hallazgos.create(scenario.auditoriaId, auditorUser(), {
      tipo: 'oportunidad',
      respuesta_id: sinEvidencia,
      descripcion: 'Automatizar el aviso de vencimientos',
    });

    expect(observation.kind).toBe('observacion');
    expect(opportunity.kind).toBe('oportunidad');
    expect(opportunity.tipo).toBe('OM');
  });

  it('exige el proceso cuando la auditoría abarca varios y valida que pertenezca al alcance', async () => {
    const multi = await EjecucionSeed.create(database, { procesos: 2 });
    const user = TokenFactory.of(multi.auditor);
    await harness.checklist.save(multi.auditoriaId, user, { respuestas: { q1: { result: 'conforme' } } });
    const view = await harness.checklist.view(multi.auditoriaId, user);
    const answer = view.preguntas[0].respuesta!.id;

    await expect(
      harness.hallazgos.create(multi.auditoriaId, user, { tipo: 'observacion', respuesta_id: answer, descripcion: 'Sin proceso' }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      harness.hallazgos.create(multi.auditoriaId, user, { tipo: 'observacion', respuesta_id: answer, proceso: scenario.procesoId, descripcion: 'Ajeno' }),
    ).rejects.toMatchObject({ status: 422 });
    const ok = await harness.hallazgos.create(multi.auditoriaId, user, {
      tipo: 'observacion',
      respuesta_id: answer,
      proceso: multi.segundoProcesoId,
      descripcion: 'Correcto',
    });
    expect(ok.proceso).toBe('Ventas');
  });

  it('lista los hallazgos y limita al dueño del proceso a los de su área', async () => {
    const all = await harness.hallazgos.list(scenario.auditoriaId, liderUser());
    const mine = await harness.hallazgos.list(scenario.auditoriaId, TokenFactory.of(scenario.auditado));

    expect(all).toHaveLength(3);
    expect(mine).toHaveLength(3);
  });

  it('permite al líder registrar su revisión y la deja versionada', async () => {
    const [first] = await harness.hallazgos.list(scenario.auditoriaId, liderUser());
    const reviewed = await harness.hallazgos.review(first.id, liderUser(), { comentario: 'Revisado con evidencia' });

    expect(reviewed.revisiones).toHaveLength(1);
    expect(reviewed.revisiones[0]).toMatchObject({ momento: 'previa', comentario: 'Revisado con evidencia' });
    expect(reviewed.revisado).toBe(false);
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadTipo, 'revision_hallazgo'));
    expect(versions).toHaveLength(1);
  });

  it('respeta la organización y el estado de la auditoría', async () => {
    const otra = await EjecucionSeed.create(database);
    const [first] = await harness.hallazgos.list(scenario.auditoriaId, liderUser());

    await expect(harness.hallazgos.review(first.id, TokenFactory.of(otra.lider), {})).rejects.toMatchObject({ status: 404 });
    await expect(harness.hallazgos.list(scenario.auditoriaId, TokenFactory.of(otra.lider))).rejects.toMatchObject({ status: 404 });
    await expect(
      harness.hallazgos.create(scenario.auditoriaId, TokenFactory.of(otra.auditor), { tipo: 'observacion', respuesta_id: sinEvidencia, descripcion: 'x' }),
    ).rejects.toMatchObject({ status: 404 });

    const cerrada = await EjecucionSeed.create(database, { estado: 'cerrada' });
    await expect(
      harness.hallazgos.create(cerrada.auditoriaId, TokenFactory.of(cerrada.auditor), { tipo: 'observacion', respuesta_id: sinEvidencia, descripcion: 'x' }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

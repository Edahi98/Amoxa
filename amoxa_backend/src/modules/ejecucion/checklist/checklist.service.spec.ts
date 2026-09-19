import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { auditoria, informacionDocumentada } from '@db/schema/index.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';

describe('ChecklistService', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let scenario: EjecucionScenario;
  let dir: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-checklist-'));
    harness = new EjecucionHarness(database, dir);
    scenario = await EjecucionSeed.create(database);
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  const auditorUser = () => TokenFactory.of(scenario.auditor);

  it('muestra las preguntas de la plantilla con el avance en cero', async () => {
    const view = await harness.checklist.view(scenario.auditoriaId, auditorUser());

    expect(view.preguntas.map((item) => item.clave)).toEqual(['q1', 'q2', 'q3']);
    expect(view.preguntas[0].criterio).toBe('norma');
    expect(view.preguntas[1].criterio).toBe('procedimiento');
    expect(view.progreso).toEqual({ total: 3, respondidas: 0, pendientes: 3, avance: 0 });
    expect(view.version).toBe(0);
  });

  it('guarda por lotes, calcula el progreso y crea versión de cada respuesta', async () => {
    const result = await harness.checklist.save(scenario.auditoriaId, auditorUser(), {
      respuestas: { q1: { result: 'conforme', comment: 'Visible en recepción' }, q2: { result: 'no_conforme' }, q3: {} },
    });

    expect(result.aplicadas).toBe(2);
    expect(result.progreso).toEqual({ total: 3, respondidas: 2, pendientes: 1, avance: 67 });
    const view = await harness.checklist.view(scenario.auditoriaId, auditorUser());
    expect(view.preguntas[0].respuesta?.result).toBe('conforme');
    expect(view.preguntas[1].respuesta?.result).toBe('no_conforme');
    expect(view.preguntas[2].respuesta).toBeNull();
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadTipo, 'respuesta_evidencia'));
    expect(versions).toHaveLength(2);
    expect(versions.every((row) => row.creadoPorId === scenario.auditor.id)).toBe(true);
  });

  it('es idempotente por pregunta: reenviar lo mismo no duplica ni versiona', async () => {
    const before = await harness.checklist.view(scenario.auditoriaId, auditorUser());
    const again = await harness.checklist.save(scenario.auditoriaId, auditorUser(), {
      respuestas: { q1: { result: 'conforme', comment: 'Visible en recepción' }, q2: { result: 'no_conforme' } },
    });
    const after = await harness.checklist.view(scenario.auditoriaId, auditorUser());

    expect(again.aplicadas).toBe(0);
    expect(again.sinCambios).toBe(2);
    expect(after.version).toBe(before.version);
    expect(after.progreso.respondidas).toBe(2);
  });

  it('reconoce el reenvío con la misma Idempotency-Key aunque If-Version ya no coincida', async () => {
    const current = await harness.checklist.view(scenario.auditoriaId, auditorUser());
    const first = await harness.checklist.save(
      scenario.auditoriaId,
      auditorUser(),
      { respuestas: { q3: { result: 'no_aplica' } } },
      { idempotencyKey: 'lote-1', ifVersion: current.version },
    );
    const replay = await harness.checklist.save(
      scenario.auditoriaId,
      auditorUser(),
      { respuestas: { q3: { result: 'no_aplica' } } },
      { idempotencyKey: 'lote-1', ifVersion: current.version },
    );

    expect(first.aplicadas).toBe(1);
    expect(replay.repetida).toBe(true);
    expect(replay.aplicadas).toBe(0);
    expect(replay.version).toBe(first.version);
  });

  it('responde 409 si If-Version no coincide con la versión del servidor', async () => {
    await expect(
      harness.checklist.save(
        scenario.auditoriaId,
        auditorUser(),
        { respuestas: { q1: { result: 'no_conforme' } } },
        { ifVersion: 999 },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('permite que el líder también responda y actualiza el autor', async () => {
    const lider = TokenFactory.of(scenario.lider);
    const result = await harness.checklist.save(scenario.auditoriaId, lider, { respuestas: { q1: { result: 'no_conforme' } } });

    expect(result.aplicadas).toBe(1);
    const view = await harness.checklist.view(scenario.auditoriaId, lider);
    expect(view.preguntas[0].respuesta?.auditorId).toBe(scenario.lider.id);
    expect(view.preguntas[0].respuesta?.version).toBe(2);
  });

  it('rechaza preguntas ajenas a la plantilla', async () => {
    await expect(
      harness.checklist.save(scenario.auditoriaId, auditorUser(), { respuestas: { q99: { result: 'conforme' } } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('bloquea a quien no forma parte del equipo y a otra organización', async () => {
    await expect(harness.checklist.view(scenario.auditoriaId, TokenFactory.of(scenario.ajeno))).rejects.toMatchObject({ status: 403 });

    const otra = await TestSeed.organizacion(database, 'Otra organización');
    const extraño = await TestSeed.usuario(database, otra, 'auditor');
    await expect(harness.checklist.view(scenario.auditoriaId, TokenFactory.of(extraño))).rejects.toMatchObject({ status: 404 });
    await expect(
      harness.checklist.save(scenario.auditoriaId, TokenFactory.of(extraño), { respuestas: { q1: { result: 'conforme' } } }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('no admite respuestas cuando la auditoría no está en curso', async () => {
    const planificada = await EjecucionSeed.create(database, { estado: 'planificada' });
    const cerrada = await EjecucionSeed.create(database, { estado: 'cerrada' });

    await expect(
      harness.checklist.save(planificada.auditoriaId, TokenFactory.of(planificada.auditor), { respuestas: { q1: { result: 'conforme' } } }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      harness.checklist.save(cerrada.auditoriaId, TokenFactory.of(cerrada.auditor), { respuestas: { q1: { result: 'conforme' } } }),
    ).rejects.toMatchObject({ status: 422 });
    const [row] = await database.orm.select().from(auditoria).where(eq(auditoria.id, planificada.auditoriaId));
    expect(row.estado).toBe('planificada');
  });

  it('guarda las evidencias declaradas en el mismo lote sin duplicarlas al reenviar', async () => {
    const lote = {
      respuestas: {
        q3: {
          result: 'conforme' as const,
          evidencias: [
            { id: 'ev-cliente-1', name: 'foto.png', size: 120, mimeType: 'image/png', capturedAt: '2026-03-10T10:00:00.000Z', latitude: 19.4, longitude: -99.1 },
          ],
        },
      },
    };
    await harness.checklist.save(scenario.auditoriaId, auditorUser(), lote);
    await harness.checklist.save(scenario.auditoriaId, auditorUser(), lote);

    const view = await harness.checklist.view(scenario.auditoriaId, auditorUser());
    expect(view.preguntas[2].respuesta?.evidencias).toHaveLength(1);
    expect(view.preguntas[2].respuesta?.evidencias[0]).toMatchObject({ id: 'ev-cliente-1', latitude: 19.4, longitude: -99.1, almacenado: false });
  });
});

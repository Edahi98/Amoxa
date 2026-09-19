import { mkdtemp, readdir, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { adjunto, informacionDocumentada, respuestaEvidencia } from '@db/schema/index.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { EvidenceFixtures } from '@testing-ejecucion/evidence-fixtures.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';
import { EvidenceService } from '@ejecucion-evidencia/evidence.service.js';
import { FileDigest } from '@ejecucion-evidencia-file/file-digest.js';

describe('EvidenceService', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let scenario: EjecucionScenario;
  let dir: string;
  let respuestaId: string;

  const auditorUser = () => TokenFactory.of(scenario.auditor);

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-evidencia-'));
    harness = new EjecucionHarness(database, dir);
    scenario = await EjecucionSeed.create(database);
    await harness.checklist.save(scenario.auditoriaId, auditorUser(), { respuestas: { q1: { result: 'no_conforme' } } });
    const view = await harness.checklist.view(scenario.auditoriaId, auditorUser());
    respuestaId = view.preguntas[0].respuesta!.id;
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('guarda el archivo, calcula el SHA-256 y sella fecha y ubicación', async () => {
    const content = EvidenceFixtures.png('uno');
    const stored = await harness.evidence.storeFile(
      scenario.auditoriaId,
      respuestaId,
      auditorUser(),
      EvidenceFixtures.file(content, '../../Foto de planta.png'),
      { capturadoEn: '2026-03-10T10:00:00.000Z', latitud: 19.43, longitud: -99.13 },
    );

    expect(stored.sha256).toBe(FileDigest.sha256(content));
    expect(stored.name).toBe('Foto-de-planta.png');
    expect(stored).toMatchObject({ latitude: 19.43, longitude: -99.13, almacenado: true, capturedAt: '2026-03-10T10:00:00.000Z' });
    const [row] = await database.orm.select().from(adjunto).where(eq(adjunto.id, stored.adjuntoId));
    expect(row.hash).toBe(stored.sha256);
    expect(row.creadoPorId).toBe(scenario.auditor.id);
    expect(row.url.includes('..')).toBe(false);
    const files = await readdir(join(dir, scenario.organizacionId, scenario.auditoriaId));
    expect(files).toHaveLength(1);
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, stored.adjuntoId));
    expect(versions).toHaveLength(1);
  });

  it('sirve el archivo verificando la huella y detecta alteraciones', async () => {
    const content = EvidenceFixtures.png('dos');
    const stored = await harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(content, 'dos.png'), {});

    const served = await harness.evidence.read(scenario.auditoriaId, respuestaId, stored.adjuntoId, auditorUser());
    expect(served.content.equals(content)).toBe(true);
    expect(served.mimeType).toBe('image/png');

    const [row] = await database.orm.select().from(adjunto).where(eq(adjunto.id, stored.adjuntoId));
    const path = join(dir, row.url);
    await chmod(path, 0o666);
    await writeFile(path, EvidenceFixtures.png('manipulado'));
    await expect(harness.evidence.read(scenario.auditoriaId, respuestaId, stored.adjuntoId, auditorUser())).rejects.toMatchObject({ status: 409 });
  });

  it('no expone operaciones para modificar o borrar evidencia ya guardada', () => {
    const methods = Object.getOwnPropertyNames(EvidenceService.prototype);

    expect(methods.filter((name) => /^(update|delete|remove|edit|replace|overwrite)/i.test(name))).toEqual([]);
  });

  it('rechaza tipos no permitidos, contenido que no corresponde, archivos vacíos y huellas falsas', async () => {
    await expect(
      harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(Buffer.from('MZ'), 'x.exe', 'application/x-msdownload'), {}),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(EvidenceFixtures.pdf(), 'falso.png', 'image/png'), {}),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(Buffer.alloc(0), 'vacio.png'), {}),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(EvidenceFixtures.png('x'), 'x.png'), { sha256: 'a'.repeat(64) }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(EvidenceFixtures.png('x'), 'x.png'), { capturadoEn: '2999-01-01T00:00:00.000Z' }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('es idempotente con el mismo clienteId', async () => {
    const content = EvidenceFixtures.png('tres');
    const first = await harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(content, 'tres.png'), { clienteId: 'cola-1' });
    const second = await harness.evidence.storeFile(scenario.auditoriaId, respuestaId, auditorUser(), EvidenceFixtures.file(content, 'tres.png'), { clienteId: 'cola-1' });

    expect(second.adjuntoId).toBe(first.adjuntoId);
  });

  it('registra los metadatos declarados por el cliente sin duplicar y valida su tipo', async () => {
    const declared = {
      evidencia: {
        archivos: [
          { id: 'meta-1', name: 'acta.pdf', size: 2048, mimeType: 'application/pdf', capturedAt: '2026-03-10T11:00:00.000Z', sha256: 'b'.repeat(64) },
        ],
        ubicacion: { latitude: 20.1, longitude: -99.2 },
      },
    };
    const first = await harness.evidence.storeDeclared(scenario.auditoriaId, respuestaId, auditorUser(), declared);
    const second = await harness.evidence.storeDeclared(scenario.auditoriaId, respuestaId, auditorUser(), declared);

    expect(first.guardadas).toHaveLength(1);
    expect(first.guardadas[0]).toMatchObject({ id: 'meta-1', almacenado: false, latitude: 20.1, longitude: -99.2, sha256: 'b'.repeat(64) });
    expect(second.guardadas).toHaveLength(0);
    expect(second.omitidas).toBe(1);
    await expect(
      harness.evidence.storeDeclared(scenario.auditoriaId, respuestaId, auditorUser(), {
        archivos: [{ id: 'meta-2', name: 'x.exe', size: 10, mimeType: 'application/x-msdownload' }],
      }),
    ).rejects.toMatchObject({ status: 415 });
    const [item] = first.guardadas;
    await expect(harness.evidence.read(scenario.auditoriaId, respuestaId, item.adjuntoId, auditorUser())).rejects.toMatchObject({ status: 404 });
  });

  it('exige archivos antes de verificar y luego marca la evidencia como verificada', async () => {
    const vacia = await EjecucionSeed.create(database);
    await harness.checklist.save(vacia.auditoriaId, TokenFactory.of(vacia.auditor), { respuestas: { q1: { result: 'no_conforme' } } });
    const view = await harness.checklist.view(vacia.auditoriaId, TokenFactory.of(vacia.auditor));
    const emptyAnswer = view.preguntas[0].respuesta!.id;

    await expect(harness.evidence.verify(vacia.auditoriaId, emptyAnswer, TokenFactory.of(vacia.auditor))).rejects.toMatchObject({ status: 422 });
    await expect(
      harness.evidence.storeDeclared(vacia.auditoriaId, emptyAnswer, TokenFactory.of(vacia.auditor), {}),
    ).rejects.toMatchObject({ status: 422 });

    const before = await harness.evidence.verificationOf(scenario.auditoriaId, respuestaId, auditorUser());
    expect(before).toMatchObject({ respuestaId, verificada: false });
    expect(before.archivos).toBeGreaterThan(0);

    const verified = await harness.evidence.verify(scenario.auditoriaId, respuestaId, auditorUser());
    const after = await harness.evidence.verificationOf(scenario.auditoriaId, respuestaId, auditorUser());
    expect(after.verificada).toBe(true);
    const otherAnswerState = await harness.evidence.verificationOf(vacia.auditoriaId, emptyAnswer, TokenFactory.of(vacia.auditor));
    expect(otherAnswerState).toMatchObject({ respuestaId: emptyAnswer, verificada: false, archivos: 0 });
    expect(verified.verificada).toBe(true);
    expect(verified.archivos).toBeGreaterThan(0);
    const [row] = await database.orm.select().from(respuestaEvidencia).where(eq(respuestaEvidencia.id, respuestaId));
    expect(row.verificada).toBe(true);
    const list = await harness.evidence.list(scenario.auditoriaId, respuestaId, auditorUser());
    expect(list.every((item) => item.verified)).toBe(true);
  });

  it('respeta la organización y el estado de la auditoría', async () => {
    const otra = await EjecucionSeed.create(database);
    await expect(
      harness.evidence.list(scenario.auditoriaId, respuestaId, TokenFactory.of(otra.auditor)),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      harness.evidence.storeFile(otra.auditoriaId, respuestaId, TokenFactory.of(otra.auditor), EvidenceFixtures.file(EvidenceFixtures.png('z')), {}),
    ).rejects.toMatchObject({ status: 404 });

    const cerrada = await EjecucionSeed.create(database, { estado: 'cerrada' });
    await expect(
      harness.evidence.storeDeclared(cerrada.auditoriaId, respuestaId, TokenFactory.of(cerrada.auditor), {
        archivos: [{ id: 'x', name: 'x.png', size: 1, mimeType: 'image/png' }],
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

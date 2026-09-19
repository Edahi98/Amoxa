import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TestDatabase } from '@testing-database/test-database.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';
import { EvidenceFixtures } from '@testing-ejecucion/evidence-fixtures.js';

describe('EjecucionDocumentoService', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let scenario: EjecucionScenario;
  let dir: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-docs-'));
    harness = new EjecucionHarness(database, dir);
    scenario = await EjecucionSeed.create(database);
    const auditor = TokenFactory.of(scenario.auditor);
    await harness.checklist.save(scenario.auditoriaId, auditor, {
      respuestas: { q1: { result: 'no_conforme', comment: 'Sin difusión' }, q2: { result: 'conforme' } },
    });
    const view = await harness.checklist.view(scenario.auditoriaId, auditor);
    const answer = view.preguntas[0].respuesta!.id;
    await harness.evidence.storeFile(scenario.auditoriaId, answer, auditor, EvidenceFixtures.file(EvidenceFixtures.png('doc')), {
      latitud: 19.4,
      longitud: -99.1,
    });
    await harness.evidence.verify(scenario.auditoriaId, answer, auditor);
    await harness.hallazgos.create(scenario.auditoriaId, auditor, { tipo: 'nc_menor', respuesta_id: answer, clausula: '5.2', descripcion: 'Política sin difusión' });
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('arma la lista de verificación con datos reales', async () => {
    const file = await harness.documentos.checklistDocument(scenario.auditoriaId, TokenFactory.of(scenario.lider));
    const text = await DocxInspector.text(file.buffer);

    expect(text).toContain('Auditoría 2026 · Compras');
    expect(text).toContain('Sin difusión');
    expect(text).toContain('2 de 3 preguntas respondidas (67%)');
    expect(text).toContain('19.40000, -99.10000');
    expect(text).toMatch(/[a-f0-9]{64}/);
    expect(text).toContain('Usuario auditor');
  });

  it('arma el acta de cierre con los hallazgos y el registro de hallazgos', async () => {
    const acta = await DocxInspector.text((await harness.documentos.actaDocument(scenario.auditoriaId, 'cierre', TokenFactory.of(scenario.auditor))).buffer);
    const registro = await DocxInspector.text((await harness.documentos.hallazgosDocument(scenario.auditoriaId, TokenFactory.of(scenario.auditado))).buffer);

    expect(acta).toContain('Política sin difusión');
    expect(acta).toContain('Sin revisar');
    expect(registro).toContain('Hallazgo 1: No conformidad menor');
    expect(registro).toContain('5.2');
  });

  it('respeta la organización', async () => {
    const otra = await EjecucionSeed.create(database);

    await expect(harness.documentos.hallazgosDocument(scenario.auditoriaId, TokenFactory.of(otra.lider))).rejects.toMatchObject({ status: 404 });
  });
});

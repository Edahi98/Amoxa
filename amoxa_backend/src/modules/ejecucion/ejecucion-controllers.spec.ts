import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Response } from 'express';
import { TestDatabase } from '@testing-database/test-database.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { RoutePermissionInspector } from '@testing-http-route/route-permission-inspector.js';
import { StreamCollector } from '@testing-http/stream-collector.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';
import { EvidenceFixtures } from '@testing-ejecucion/evidence-fixtures.js';
import { ChecklistController } from '@ejecucion-checklist/checklist.controller.js';
import { EvidenciasController } from '@ejecucion-evidencia/evidencias.controller.js';
import { HallazgoRevisionController } from '@ejecucion-hallazgos/hallazgo-revision.controller.js';
import { HallazgosController } from '@ejecucion-hallazgos/hallazgos.controller.js';
import { AperturaController } from '@ejecucion-reuniones-apertura/apertura.controller.js';
import { CierreController } from '@ejecucion-reuniones-cierre/cierre.controller.js';
import { ReunionesController } from '@ejecucion-reuniones/reuniones.controller.js';

const CONTROLLERS = [
  ChecklistController,
  EvidenciasController,
  HallazgosController,
  HallazgoRevisionController,
  AperturaController,
  CierreController,
  ReunionesController,
];

describe('protección de rutas de ejecución', () => {
  it.each(CONTROLLERS.map((controller) => [controller.name, controller] as const))('%s no tiene rutas sin guardias', (_name, controller) => {
    expect(RouteGuardInspector.unprotected(controller)).toEqual([]);
  });

  it.each([
    [ChecklistController, 'guardar', ['ejecucion.responder_checklist'], []],
    [EvidenciasController, 'subir', ['evidencia.capturar'], []],
    [EvidenciasController, 'verificar', ['evidencia.capturar'], []],
    [HallazgosController, 'crear', ['hallazgo.registrar'], []],
    [HallazgoRevisionController, 'revisar', ['hallazgo.revisar'], []],
    [AperturaController, 'registrar', ['ejecucion.presidir_apertura'], []],
    [AperturaController, 'confirmar', ['ejecucion.asistir_apertura'], []],
    [CierreController, 'anotarRevision', ['ejecucion.presentar_cierre'], []],
    [CierreController, 'cerrar', ['ejecucion.presentar_cierre'], []],
    [CierreController, 'asistir', ['ejecucion.asistir_cierre'], []],
    [CierreController, 'aceptar', ['ejecucion.aceptar_o_discrepar_cierre'], []],
    [CierreController, 'discrepar', ['ejecucion.aceptar_o_discrepar_cierre'], []],
  ] as const)('%s.%s exige el permiso esperado', (controller, route, all, any) => {
    const permissions = RoutePermissionInspector.of(controller, route);

    expect(permissions.all).toEqual(all);
    expect(permissions.any).toEqual(any);
    expect(RouteGuardInspector.guardsOf(controller, route)).toContain('PermissionsGuard');
  });

  it('las lecturas y documentos aceptan cualquiera de los permisos del flujo', () => {
    expect(RoutePermissionInspector.of(ChecklistController, 'documento').any).toContain('ejecucion.responder_checklist');
    expect(RoutePermissionInspector.of(HallazgosController, 'listar').any).toContain('ejecucion.aceptar_o_discrepar_cierre');
    expect(RoutePermissionInspector.of(ReunionesController, 'documento').any).toContain('ejecucion.asistir_cierre');
    expect(RoutePermissionInspector.of(EvidenciasController, 'archivo').any).toContain('evidencia.capturar');
    expect(RoutePermissionInspector.of(EvidenciasController, 'estadoParaHallazgo').any).toContain('hallazgo.registrar');
  });

  it('no existen rutas de modificación ni borrado de evidencia', () => {
    const names = Object.getOwnPropertyNames(EvidenciasController.prototype);

    expect(names.filter((name) => /^(actualizar|borrar|eliminar|editar|update|delete|remove)/i.test(name))).toEqual([]);
  });
});

describe('controladores de ejecución', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let scenario: EjecucionScenario;
  let dir: string;

  const request = (rol: 'lider_auditor' | 'auditor' | 'auditado', id: string) => new FakeRequest(rol, id, scenario.organizacionId).asRequest();
  const response = () => {
    const headers: Record<string, string> = {};
    return { headers, res: { set: (values: Record<string, string>) => Object.assign(headers, values) } as unknown as Response };
  };

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-ctrl-'));
    harness = new EjecucionHarness(database, dir);
    scenario = await EjecucionSeed.create(database, { estado: 'planificada' });
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('recorre apertura, checklist, evidencia, hallazgo y cierre por los controladores', async () => {
    const apertura = new AperturaController(harness.apertura);
    const checklist = new ChecklistController(harness.checklist, harness.documentos);
    const evidencias = new EvidenciasController(harness.evidence);
    const hallazgos = new HallazgosController(harness.hallazgos, harness.documentos);
    const revision = new HallazgoRevisionController(harness.hallazgos);
    const cierre = new CierreController(harness.cierre);
    const reuniones = new ReunionesController(harness.reuniones, harness.documentos);
    const lider = request('lider_auditor', scenario.lider.id);
    const auditor = request('auditor', scenario.auditor.id);
    const dueno = request('auditado', scenario.auditado.id);

    const opened = await apertura.registrar(scenario.auditoriaId, { asistentes: [scenario.auditor.id, scenario.auditado.id] }, lider);
    expect(opened.registrada).toBe(true);
    await apertura.confirmar(scenario.auditoriaId, auditor);

    const saved = await checklist.guardar(scenario.auditoriaId, { respuestas: { q1: { result: 'no_conforme' } } }, auditor, 'k-1', '0');
    expect(saved.aplicadas).toBe(1);
    const view = await checklist.ver(scenario.auditoriaId, lider);
    const answer = view.preguntas[0].respuesta!.id;

    const stored = await evidencias.subir(
      scenario.auditoriaId,
      answer,
      { latitud: 19.4, longitud: -99.1 },
      auditor,
      EvidenceFixtures.file(EvidenceFixtures.png('ctrl'), 'ctrl.png'),
    );
    expect('sha256' in stored && stored.sha256).toMatch(/^[a-f0-9]{64}$/);
    const declared = await evidencias.subir(scenario.auditoriaId, answer, { archivos: [{ id: 'm1', name: 'a.pdf', size: 5, mimeType: 'application/pdf' }] }, auditor);
    expect('guardadas' in declared && declared.guardadas).toHaveLength(1);
    expect((await evidencias.listar(scenario.auditoriaId, answer, lider)).length).toBe(2);
    await evidencias.verificar(scenario.auditoriaId, answer, {}, auditor);

    const served = response();
    const file = await evidencias.archivo(scenario.auditoriaId, answer, (stored as { adjuntoId: string }).adjuntoId, auditor, served.res);
    expect((await StreamCollector.toBuffer(file.getStream())).length).toBeGreaterThan(8);
    expect(served.headers['Content-Type']).toBe('image/png');
    expect(served.headers['X-Content-Type-Options']).toBe('nosniff');

    const finding = await hallazgos.crear(
      scenario.auditoriaId,
      { tipo: 'nc_mayor', respuesta_id: answer, clausula: '5.2', descripcion: 'Política no comunicada' },
      auditor,
    );
    await revision.revisar(finding.id, { comentario: 'Visto' }, lider);
    expect(await hallazgos.listar(scenario.auditoriaId, dueno)).toHaveLength(1);

    await expect(cierre.cerrar(scenario.auditoriaId, { asistentes: [] }, lider)).rejects.toMatchObject({ status: 422 });
    await cierre.anotarRevision(scenario.auditoriaId, { hallazgo_id: finding.id, resultado_area: 'aceptado' }, lider);
    await cierre.aceptar(scenario.auditoriaId, {}, dueno);
    await cierre.asistir(scenario.auditoriaId, auditor);
    const closed = await cierre.cerrar(scenario.auditoriaId, { asistentes: [] }, lider);
    expect(closed.estado).toBe('cerrada');

    const acta = response();
    const actaFile = await reuniones.documento(scenario.auditoriaId, 'cierre', lider, acta.res);
    const text = await DocxInspector.text(await StreamCollector.toBuffer(actaFile.getStream()));
    expect(acta.headers['Content-Disposition']).toContain('acta-reunion-cierre.docx');
    expect(text).toContain('Política no comunicada');
    expect((await reuniones.ver(scenario.auditoriaId, 'cierre', lider)).registrada).toBe(true);

    const registro = response();
    const registroFile = await hallazgos.documento(scenario.auditoriaId, lider, registro.res);
    expect((await StreamCollector.toBuffer(registroFile.getStream())).length).toBeGreaterThan(1000);
    const lista = response();
    const listaFile = await checklist.documento(scenario.auditoriaId, lider, lista.res);
    expect((await StreamCollector.toBuffer(listaFile.getStream())).length).toBeGreaterThan(1000);
  });

  it('rechaza cabeceras de idempotencia mal formadas', async () => {
    const checklist = new ChecklistController(harness.checklist, harness.documentos);

    await expect(
      checklist.guardar(scenario.auditoriaId, { respuestas: {} }, request('auditor', scenario.auditor.id), "bad key'; --", undefined),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      checklist.guardar(scenario.auditoriaId, { respuestas: {} }, request('auditor', scenario.auditor.id), undefined, 'abc'),
    ).rejects.toMatchObject({ status: 400 });
  });
});

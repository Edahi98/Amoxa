import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionRole } from '@shared/roles.js';
import type { RawComponent, RawScreen } from '@sdui-builder/raw-json.types.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import type { ScreenData } from '@sdui-data/screen-data.types.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import { TestDatabase } from '@testing-database/test-database.js';
import type { SeededUser } from '@testing-database/test-seed.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';
import { AperturaScreenProvider } from '@ejecucion-reuniones-apertura/apertura-screen.provider.js';
import { ChecklistScreenProvider } from '@ejecucion-checklist/checklist-screen.provider.js';
import { CierreScreenProvider } from '@ejecucion-reuniones-cierre/cierre-screen.provider.js';
import { EvidenciaScreenProvider } from '@ejecucion-evidencia/evidencia-screen.provider.js';
import { HallazgoScreenProvider } from '@ejecucion-hallazgos/hallazgo-screen.provider.js';
import '@screens/index.js';

class ScreenProbe {
  public static flatten(component: RawComponent): RawComponent[] {
    return [component, ...(component.children ?? []).flatMap((child) => ScreenProbe.flatten(child))];
  }

  public static build(screenId: string, role: SessionRole, loaded: ScreenData): RawScreen {
    const context = ScreenContextBuilder.forUser({ id: 'u-1', rol: role });
    if (loaded.entity !== undefined) context.entity(loaded.entity);
    if (loaded.data !== undefined) context.data(loaded.data);
    if (loaded.offline !== undefined) context.offline(loaded.offline);
    return ScreenFactory.createById(screenId, context);
  }
}

describe('proveedores de datos de ejecución', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let scenario: EjecucionScenario;
  let dir: string;
  let answerId: string;

  const request = (screenId: string, role: SessionRole, user: SeededUser, entityId?: string) => ({
    screenId,
    user: TokenFactory.of(user),
    role,
    entityId: entityId ?? scenario.auditoriaId,
    entityType: 'auditoria',
  });

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-prov-'));
    harness = new EjecucionHarness(database, dir);
    scenario = await EjecucionSeed.create(database, { estado: 'planificada' });
    const lider = TokenFactory.of(scenario.lider);
    const auditor = TokenFactory.of(scenario.auditor);
    await harness.apertura.register(scenario.auditoriaId, lider, { asistentes: [scenario.auditor.id, scenario.auditado.id], notas: 'Notas de apertura' });
    await harness.checklist.save(scenario.auditoriaId, auditor, { respuestas: { q1: { result: 'no_conforme', comment: 'Sin difusión' }, q2: { result: 'conforme' } } });
    const view = await harness.checklist.view(scenario.auditoriaId, auditor);
    answerId = view.preguntas[0].respuesta!.id;
    await harness.evidence.storeDeclared(scenario.auditoriaId, answerId, auditor, { archivos: [{ id: 'p1', name: 'foto.png', size: 10, mimeType: 'image/png' }] });
    await harness.evidence.verify(scenario.auditoriaId, answerId, auditor);
    await harness.hallazgos.create(scenario.auditoriaId, auditor, { tipo: 'nc_mayor', respuesta_id: answerId, clausula: '5.2', descripcion: 'Política no comunicada' });
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('registra un proveedor para cada pantalla de ejecución', () => {
    for (const screenId of ['ejecucion.apertura', 'ejecucion.checklist', 'ejecucion.evidencia', 'hallazgo.lista', 'ejecucion.cierre']) {
      expect(ScreenDataRegistry.providerFor(screenId), screenId).toBeDefined();
    }
    expect(ScreenDataRegistry.providerFor('ejecucion.checklist')).toBe(ChecklistScreenProvider);
  });

  it('apertura: entrega tarjeta de auditoría, asistentes y candidatos', async () => {
    const provider = new AperturaScreenProvider(harness.access, harness.resumen, harness.reuniones);
    const loaded = await provider.load(request('ejecucion.apertura', 'lider', scenario.lider));
    const apertura = loaded.data?.['apertura'] as Record<string, unknown>;

    expect(loaded.entity).toMatchObject({ type: 'auditoria', id: scenario.auditoriaId, estado: 'en_curso' });
    expect(loaded.data?.['auditoria']).toMatchObject({ method: 'in_situ', leader: 'Usuario lider_auditor', status: 'en_curso' });
    expect(apertura['notas']).toBe('Notas de apertura');
    expect(apertura['asistentes']).toEqual(expect.arrayContaining([scenario.auditor.id, scenario.auditado.id]));
    expect(apertura['opciones_asistentes']).toHaveLength(3);
    expect(await provider.load({ ...request('ejecucion.apertura', 'lider', scenario.lider), entityId: undefined })).toEqual({});

    const screen = ScreenProbe.build('ejecucion.apertura', 'lider', loaded);
    const picker = ScreenProbe.flatten(screen.root).find((item) => item.id === 'asistentes');
    expect((picker?.props?.['options'] as unknown[]).length).toBe(3);
  });

  it('checklist: entrega preguntas, respuestas, avance, versión y modo sin conexión', async () => {
    const provider = new ChecklistScreenProvider(harness.access, harness.resumen, harness.checklist);
    const loaded = await provider.load(request('ejecucion.checklist', 'auditor', scenario.auditor));
    const checklist = loaded.data?.['checklist'] as Record<string, unknown>;
    const respuestas = loaded.data?.['respuestas'] as Record<string, Record<string, unknown>>;

    expect(loaded.offline).toEqual({ enabled: true, cache_ttl_seconds: 86400, conflict_policy: 'manual' });
    expect(loaded.entity?.version).toBeGreaterThan(0);
    expect(checklist).toMatchObject({ avance: 67, pendientes: 1, total: 3, respondidas: 2 });
    expect(respuestas['q1']).toMatchObject({ result: 'no_conforme', comment: 'Sin difusión' });
    expect(respuestas['q3']).toEqual({});

    const screen = ScreenProbe.build('ejecucion.checklist', 'auditor', loaded);
    const items = ScreenProbe.flatten(screen.root).filter((item) => item.type === 'checklist_item');
    expect(items.map((item) => item.bind)).toEqual(['respuestas.q1', 'respuestas.q2', 'respuestas.q3']);
    expect(items[0].props).toMatchObject({ question: 'La política de la calidad está disponible.', clause: '5.2', criterion: 'norma' });
    expect(items[1].props).toMatchObject({ criterion: 'procedimiento' });
    expect(screen.context.offline?.enabled).toBe(true);
  });

  it('checklist: sin datos muestra un aviso en lugar de preguntas', () => {
    const screen = ScreenProbe.build('ejecucion.checklist', 'auditor', {});

    expect(ScreenProbe.flatten(screen.root).some((item) => item.id === 'sin_preguntas')).toBe(true);
  });

  it('evidencia: propone la respuesta no conforme y entrega sus archivos', async () => {
    const provider = new EvidenciaScreenProvider(harness.access, harness.checklist);
    const loaded = await provider.load(request('ejecucion.evidencia', 'auditor', scenario.auditor));
    const evidencia = loaded.data?.['evidencia'] as Record<string, unknown>;

    expect(loaded.offline?.enabled).toBe(true);
    expect(evidencia['respuesta_id']).toBe(answerId);
    expect(evidencia['verificada']).toBe(true);
    expect(evidencia['archivos']).toHaveLength(1);
    expect(evidencia['opciones_respuestas']).toHaveLength(2);

    const screen = ScreenProbe.build('ejecucion.evidencia', 'auditor', loaded);
    const select = ScreenProbe.flatten(screen.root).find((item) => item.id === 'respuesta');
    expect((select?.props?.['options'] as unknown[]).length).toBe(2);
    expect(screen.actions['guardar_evidencia'].endpoint).toContain('{data.evidencia.respuesta_id}');
  });

  it('hallazgos: entrega listas de opciones al auditor y la tarjeta de revisión al líder', async () => {
    const provider = new HallazgoScreenProvider(harness.access, harness.resumen, harness.checklist, harness.hallazgos);
    const forAuditor = await provider.load(request('hallazgo.lista', 'auditor', scenario.auditor));
    const forLeader = await provider.load(request('hallazgo.lista', 'lider', scenario.lider));
    const form = forAuditor.data?.['hallazgo'] as Record<string, unknown>;
    const card = forLeader.data?.['hallazgo'] as Record<string, unknown>;

    expect(forAuditor.data?.['hallazgos']).toHaveLength(1);
    expect(form['evidencias_verificadas']).toEqual([]);
    expect(form['proceso']).toBe(scenario.procesoId);
    expect(form['opciones_respuestas']).toHaveLength(2);
    expect(card).toMatchObject({ kind: 'nc_mayor', clause: '5.2', process: 'Compras', evidenceCount: 1 });
    expect(typeof card['id']).toBe('string');

    const screen = ScreenProbe.build('hallazgo.lista', 'auditor', forAuditor);
    const select = ScreenProbe.flatten(screen.root).find((item) => item.id === 'respuesta');
    expect((select?.props?.['options'] as unknown[]).length).toBe(2);
    const leaderScreen = ScreenProbe.build('hallazgo.lista', 'lider', forLeader);
    expect(leaderScreen.actions['revisar_hallazgo'].endpoint).toBe('/hallazgos/{data.hallazgo.id}/revision');
    expect(leaderScreen.actions['descargar_hallazgos'].endpoint).toBe('/auditorias/{entity.id}/hallazgos/documento');
  });

  it('cierre: calcula hallazgos pendientes y el dueño solo ve su área', async () => {
    const provider = new CierreScreenProvider(harness.access, harness.resumen, harness.hallazgos);
    const loaded = await provider.load(request('ejecucion.cierre', 'lider', scenario.lider));
    const cierre = loaded.data?.['cierre'] as Record<string, unknown>;

    expect(cierre['hallazgos_pendientes']).toBe(1);
    expect(cierre['puede_cerrar']).toBe(false);
    expect(cierre['opciones_hallazgos']).toHaveLength(1);
    expect(cierre['hallazgos']).toEqual([expect.objectContaining({ status: 'Sin revisar' })]);

    const asOwner = await provider.load(request('ejecucion.cierre', 'dueno_proceso', scenario.auditado));
    expect((asOwner.data?.['cierre'] as Record<string, unknown>)['hallazgos']).toHaveLength(1);

    const [hallazgoId] = (cierre['opciones_hallazgos'] as { value: string }[]).map((item) => item.value);
    await harness.cierre.annotateReview(scenario.auditoriaId, TokenFactory.of(scenario.lider), { hallazgo_id: hallazgoId, resultado_area: 'aceptado' });
    const after = await provider.load(request('ejecucion.cierre', 'lider', scenario.lider));
    expect((after.data?.['cierre'] as Record<string, unknown>)['hallazgos_pendientes']).toBe(0);

    const screen = ScreenProbe.build('ejecucion.cierre', 'lider', after);
    expect(screen.actions['descargar_acta'].endpoint).toBe('/auditorias/{entity.id}/reuniones/cierre/documento');
    expect(ScreenProbe.flatten(screen.root).some((item) => item.id === 'hallazgo')).toBe(true);
    expect(RoleMapper.toSessionRole('admin')).toBe('direccion');
  });

  it('respeta la organización al cargar datos de pantalla', async () => {
    const otra = await EjecucionSeed.create(database);
    const provider = new ChecklistScreenProvider(harness.access, harness.resumen, harness.checklist);

    await expect(provider.load(request('ejecucion.checklist', 'auditor', otra.auditor))).rejects.toMatchObject({ status: 404 });
  });
});

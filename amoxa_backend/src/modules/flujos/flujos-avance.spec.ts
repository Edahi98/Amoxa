import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { accion, auditoria, flujoInstancia, plantillaChecklist } from '@schemas/index.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type { RawComponent } from '@sdui-builder/raw-json.types.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { FlujosController } from '@flujos-controllers/flujos.controller.js';
import { FlujoScreenProvider } from '@flujos-screens/flujo-screen.provider.js';
import { FlujoInstanceService } from '@flujos-services-flujo/flujo-instance.service.js';
import { FlujoProgressService } from '@flujos-services-flujo/flujo-progress.service.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { AuditFlowSeed, type AuditScenario } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import '@screens/index.js';

const FLOW = 'ciclo-auditoria';

describe('flujo de trabajo con avance real', () => {
  let database: TestDatabase;
  let scenario: AuditScenario;
  let progress: FlujoProgressService;
  let instances: FlujoInstanceService;
  let provider: FlujoScreenProvider;

  const gestor = () => TokenFactory.of(scenario.gestor);
  const setAudit = (estado: 'planificada' | 'en_curso' | 'cerrada' | 'finalizada' | 'cancelada') =>
    database.orm.update(auditoria).set({ estado }).where(eq(auditoria.id, scenario.auditoriaId));
  const state = async (id: string) => (await instances.get(id, gestor(), 'gestor')).progress;

  beforeAll(async () => {
    database = await TestDatabase.create();
    scenario = await AuditFlowSeed.create(database, 'planificada');
    progress = new FlujoProgressService(database.db);
    instances = new FlujoInstanceService(database.db, progress);
    provider = new FlujoScreenProvider(database.db, instances);
  });

  afterAll(() => database.close());

  describe('iniciar', () => {
    let id: string;

    it('crea la instancia sobre una auditoría visible', async () => {
      ({ id } = await instances.start(FLOW, scenario.auditoriaId, gestor(), 'gestor'));

      const [row] = await database.orm.select().from(flujoInstancia).where(eq(flujoInstancia.id, id));
      expect(row).toMatchObject({ flujoId: FLOW, auditoriaId: scenario.auditoriaId, iniciadoPorId: scenario.gestor.id, completadoEn: null });
    });

    it('no permite dos flujos activos sobre la misma auditoría', async () => {
      await expect(instances.start(FLOW, scenario.auditoriaId, gestor(), 'gestor')).rejects.toThrow(ConflictException);
    });

    it('rechaza flujos y auditorías inexistentes', async () => {
      await expect(instances.start('no-existe', scenario.auditoriaId, gestor(), 'gestor')).rejects.toThrow(NotFoundException);
      await expect(instances.start(FLOW, '00000000-0000-4000-8000-000000000000', gestor(), 'gestor')).rejects.toThrow(NotFoundException);
    });

    it('otra organización no puede iniciar ni ver el flujo', async () => {
      const otherOrg = await TestSeed.organizacion(database, 'Otra organización');
      const stranger = await TestSeed.usuario(database, otherOrg, 'gestor_programa');
      const token = TokenFactory.of(stranger);

      await expect(instances.start(FLOW, scenario.auditoriaId, token, 'gestor')).rejects.toThrow(NotFoundException);
      await expect(instances.get(id, token, 'gestor')).rejects.toThrow(NotFoundException);
      expect(await instances.list(token, 'gestor')).toEqual([]);
    });

    it('no se puede concluir mientras falten pasos', async () => {
      await expect(instances.conclude(id, gestor(), 'gestor')).rejects.toThrow(UnprocessableEntityException);
    });

    it('al iniciar solo el primer paso está en curso y los demás esperan', async () => {
      const result = await state(id);

      expect(result.steps.map((step) => step.state)).toEqual(['en_curso', 'pendiente', 'pendiente', 'pendiente', 'pendiente']);
      expect(result.completed).toBe(0);
      expect(result.currentStepId).toBe('plantillas');
      expect(result.steps[0].detail).toContain('borrador');
    });

    it('avanza al publicar la plantilla, sin que nadie marque nada', async () => {
      await database.orm.update(plantillaChecklist).set({ estado: 'publicada' }).where(eq(plantillaChecklist.id, (await state(id)).plantillaId));

      const result = await state(id);
      expect(result.steps.map((step) => step.state)).toEqual(['completado', 'en_curso', 'pendiente', 'pendiente', 'pendiente']);
      expect(result.steps[1].detail).toContain('planificada');
    });

    it('la plantilla no vigente no cuenta como completada', async () => {
      const plantillaId = (await state(id)).plantillaId;
      await database.orm.update(plantillaChecklist).set({ vigente: false }).where(eq(plantillaChecklist.id, plantillaId));
      expect((await state(id)).steps[0].state).toBe('en_curso');

      await database.orm.update(plantillaChecklist).set({ vigente: true }).where(eq(plantillaChecklist.id, plantillaId));
      expect((await state(id)).steps[0].state).toBe('completado');
    });

    it('avanza cuando la auditoría se ejecuta y se cierra', async () => {
      await setAudit('en_curso');
      expect((await state(id)).steps[1].detail).toContain('en curso');

      await setAudit('cerrada');
      const result = await state(id);
      expect(result.steps.map((step) => step.state)).toEqual(['completado', 'completado', 'en_curso', 'pendiente', 'pendiente']);
    });

    it('avanza al distribuir el informe y pide las acciones de cada no conformidad', async () => {
      await setAudit('finalizada');

      const result = await state(id);
      expect(result.steps.map((step) => step.state)).toEqual(['completado', 'completado', 'completado', 'en_curso', 'pendiente']);
      expect(result.steps[3].detail).toContain('Faltan acciones');
      expect(result.canConclude).toBe(false);
    });

    it('cuenta las acciones cerradas con eficacia verificada', async () => {
      const [created] = await database.orm
        .insert(accion)
        .values({
          hallazgoId: scenario.hallazgoNcId,
          responsableId: scenario.auditado.id,
          tipo: 'correctiva',
          descripcion: 'Evaluar a los proveedores críticos',
          fechaLimite: '2026-12-31',
        })
        .returning({ id: accion.id });
      expect((await state(id)).steps[3].detail).toContain('0 de 1');

      await database.orm.update(accion).set({ estado: 'completada' }).where(eq(accion.id, created.id));
      expect((await state(id)).steps[3].state).toBe('en_curso');

      await database.orm.update(accion).set({ verificacionEficacia: 'ok' }).where(eq(accion.id, created.id));
      const result = await state(id);
      expect(result.steps.map((step) => step.state)).toEqual(['completado', 'completado', 'completado', 'completado', 'en_curso']);
      expect(result.canConclude).toBe(true);
    });

    it('el último paso lo confirma la persona y concluye el flujo', async () => {
      await instances.conclude(id, gestor(), 'gestor');

      const result = await state(id);
      expect(result).toMatchObject({ state: 'concluido', completed: 5, currentStepId: null, canConclude: false });
      await expect(instances.conclude(id, gestor(), 'gestor')).rejects.toThrow(ConflictException);
    });

    it('una auditoría cancelada marca el flujo como cancelado y no deja ningún paso en curso', async () => {
      await setAudit('cancelada');

      const result = await state(id);
      expect(result.state).toBe('cancelado');
      expect(result.currentStepId).toBeNull();
      expect(result.canConclude).toBe(false);
      await setAudit('finalizada');
    });

    it('una vez concluido se puede iniciar otro flujo sobre la misma auditoría', async () => {
      const { id: second } = await instances.start(FLOW, scenario.auditoriaId, gestor(), 'gestor');

      expect(second).not.toBe(id);
    });
  });

  describe('pantallas', () => {
    const components = (component: RawComponent): RawComponent[] => [component, ...(component.children ?? []).flatMap(components)];

    it('la lista trae los flujos disponibles y los iniciados con su avance', async () => {
      const result = await provider.load({ screenId: 'flujo.lista', user: gestor(), role: 'gestor' });
      const data = result.data as { flujos: unknown[]; instancias: Record<string, unknown>[] };

      expect(data.flujos).toHaveLength(1);
      expect(data.instancias.length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(data.instancias[0]).sort()).toEqual(['auditoria', 'avance', 'estado', 'flujo', 'id', 'paso']);
    });

    it('la guía ofrece solo auditorías visibles sin flujo activo', async () => {
      const [{ id: activeId }] = await database.orm.select({ id: flujoInstancia.id }).from(flujoInstancia).where(eq(flujoInstancia.auditoriaId, scenario.auditoriaId)).limit(1);
      expect(activeId).toBeDefined();

      const result = await provider.load({ screenId: 'flujo.guia', entityId: FLOW, user: gestor(), role: 'gestor' });
      const options = (result.data as { opciones: { auditorias: unknown[] } }).opciones.auditorias;

      expect(result.entity).toEqual({ type: 'flujo', id: FLOW, version: 1 });
      expect(options).toEqual([]);
    });

    it('el avance entrega los pasos con su estado y los ids que usan las pantallas', async () => {
      const [row] = await database.orm.select().from(flujoInstancia).limit(1);
      const result = await provider.load({ screenId: 'flujo.avance', entityId: row.id, user: gestor(), role: 'gestor' });
      const avance = (result.data as { avance: Record<string, unknown> }).avance;

      expect(avance).toMatchObject({ flujo_id: FLOW, auditoria_id: scenario.auditoriaId, porcentaje: expect.any(Number) });
      expect((avance.pasos as unknown[]).length).toBe(5);
      expect(result.entity?.type).toBe('flujo_instancia');
    });

    it('la pantalla de avance muestra la tabla de pasos, el siguiente paso y concluir solo cuando corresponde', () => {
      const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' });
      context.data({ avance: { flujo_id: FLOW } });
      const screen = ScreenFactory.createById('flujo.avance', context);
      const all = components(screen.root);
      const conclude = all.find((component) => component.id === 'btn_concluir');

      expect(all.find((component) => component.id === 'tabla_pasos')?.type).toBe('table');
      expect(all.find((component) => component.id === 'progreso')?.type).toBe('progress');
      expect(JSON.stringify(conclude?.visible_if)).toContain('data.avance.puede_concluir');
      expect(screen.actions['concluir_flujo']).toMatchObject({ type: 'call_api', method: 'POST' });
    });

    it('cada botón del siguiente paso solo aparece en su paso y apunta a una pantalla que el rol ve', () => {
      const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' });
      context.data({ avance: { flujo_id: FLOW } });
      const screen = ScreenFactory.createById('flujo.avance', context);

      for (const row of components(screen.root).filter((component) => component.id.startsWith('siguiente_'))) {
        expect(JSON.stringify(row.visible_if)).toContain('data.avance.paso_actual');
        for (const button of row.children ?? []) {
          const action = screen.actions[button.on?.['press'] as string];
          expect(RoleAccess.canSee('gestor', action.screen_id as string), button.id).toBe(true);
        }
      }
      expect(JSON.stringify(screen.actions['avance_plantilla_lista'])).toContain('data.avance.plantilla_id');
      expect(JSON.stringify(screen.actions['avance_informe_ver'])).toContain('data.avance.auditoria_id');
    });

    it('iniciar desde la guía manda la auditoría elegida y abre el avance al terminar', () => {
      const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' });
      context.entity({ type: 'flujo', id: FLOW, version: 1 });
      context.data({ opciones: { auditorias: [{ value: 'a1', label: 'Auditoría' }] }, inicio: { auditoria_id: '' } });
      const screen = ScreenFactory.createById('flujo.guia', context);
      const start = screen.actions['iniciar_flujo'];

      expect(start).toMatchObject({ type: 'call_api', method: 'POST', endpoint: '/flujos/{entity.id}/instancias', on_success: 'abrir_instancia' });
      expect(JSON.stringify(start.payload)).toContain('data.inicio.auditoria_id');
      expect(screen.actions['abrir_instancia']).toMatchObject({ type: 'navigate', screen_id: 'flujo.avance' });
      expect(components(screen.root).some((component) => component.id === 'btn_iniciar')).toBe(true);
    });

    it('sin auditorías disponibles la guía no ofrece iniciar', () => {
      const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' });
      context.entity({ type: 'flujo', id: FLOW, version: 1 });
      const screen = ScreenFactory.createById('flujo.guia', context);

      expect(components(screen.root).some((component) => component.id === 'btn_iniciar')).toBe(false);
      expect(JSON.stringify(screen.root)).toContain('No hay auditorías disponibles');
    });
  });

  it('los endpoints de flujos exigen sesión válida y rol existente', () => {
    expect(RouteGuardInspector.unprotected(FlujosController)).toEqual([]);
    expect(RouteGuardInspector.routes(FlujosController)).toHaveLength(3);
  });
});

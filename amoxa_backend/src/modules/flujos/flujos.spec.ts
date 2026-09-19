import { ROLES, SHARED_SCREENS, type SessionRole } from '@shared/roles.js';
import { WORKFLOWS } from '@shared-workflow/workflows.js';
import { WorkflowCatalog } from '@shared-workflow/workflow-catalog.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type { RawComponent, RawScreen } from '@sdui-builder/raw-json.types.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import '@screens/index.js';

class GuideChecks {
  public static components(component: RawComponent): RawComponent[] {
    return [component, ...(component.children ?? []).flatMap((child) => GuideChecks.components(child))];
  }

  public static build(role: SessionRole, screenId: string, entityId?: string): RawScreen {
    const context = ScreenContextBuilder.forUser({ id: 'u1', rol: role });
    if (entityId !== undefined) context.entity({ type: 'flujo', id: entityId, version: 1 });
    return ScreenFactory.createById(screenId, context);
  }

  public static destinations(screen: RawScreen): string[] {
    return GuideChecks.components(screen.root)
      .filter((component) => component.type === 'button')
      .map((component) => screen.actions[component.on?.['press'] as string]?.screen_id as string);
  }
}

const ROLES_TO_CHECK = (Object.keys(ROLES) as SessionRole[]).filter((role) => (role as string) !== 'sistema');
const WORKFLOW_IDS = WorkflowCatalog.ids();

describe('catálogo de flujos de trabajo', () => {
  it('el ciclo de una auditoría tiene los cinco pasos en orden', () => {
    expect(WORKFLOWS['ciclo-auditoria'].steps.map((step) => step.id)).toEqual(['plantillas', 'ejecucion', 'informe', 'acciones', 'analisis']);
  });

  it('cada paso apunta a pantallas que existen y a roles que existen', () => {
    const screens = new Set(Object.values(ROLES).flatMap((role) => role.screens));
    for (const workflow of Object.values(WORKFLOWS)) {
      for (const step of workflow.steps) {
        for (const screenId of step.screens) expect(screens, `${step.id}: ${screenId}`).toContain(screenId);
        for (const role of step.roles) expect(Object.keys(ROLES), `${step.id}: ${role}`).toContain(role);
      }
    }
  });

  it('cada paso trae título, resumen, tareas y cláusula, con ids únicos', () => {
    for (const workflow of Object.values(WORKFLOWS)) {
      const ids = workflow.steps.map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const step of workflow.steps) {
        expect(step.title, step.id).not.toBe('');
        expect(step.summary, step.id).not.toBe('');
        expect(step.tasks.length, step.id).toBeGreaterThan(0);
        expect(step.clause, step.id).not.toBe('');
      }
    }
  });

  it('no menciona inteligencia artificial', () => {
    expect(JSON.stringify(WORKFLOWS).toLowerCase()).not.toMatch(/\bia\b|inteligencia artificial/);
  });

  it('busca un flujo por id y rechaza los desconocidos', () => {
    expect(WorkflowCatalog.find('ciclo-auditoria')?.title).toBe('Ciclo de una auditoría');
    expect(WorkflowCatalog.find('nada')).toBeUndefined();
    expect(WorkflowCatalog.find(undefined)).toBeUndefined();
    expect(WorkflowCatalog.find('constructor')).toBeUndefined();
  });
});

describe('página de flujos de trabajo', () => {
  it('las pantallas de flujos las ve cualquier rol, sin figurar en sus listas', () => {
    for (const role of ROLES_TO_CHECK) {
      expect(RoleAccess.canSee(role, 'flujo.lista')).toBe(true);
      expect(RoleAccess.canSee(role, 'flujo.guia')).toBe(true);
      expect(ROLES[role].screens).not.toContain('flujo.lista');
    }
    expect(SHARED_SCREENS).toEqual(expect.arrayContaining(['flujo.lista', 'flujo.guia', 'flujo.avance']));
  });

  it.each(ROLES_TO_CHECK)('la lista se arma para %s con una tabla de flujos que abre la guía', (role) => {
    const screen = GuideChecks.build(role, 'flujo.lista');
    const tables = GuideChecks.components(screen.root).filter((component) => component.type === 'table');
    const catalog = tables.find((component) => component.bind === 'flujos');
    const started = tables.find((component) => component.bind === 'instancias');

    expect(catalog?.on?.['press']).toBe('abrir_flujo');
    expect(started?.on?.['press']).toBe('abrir_instancia');
    expect(screen.actions['abrir_flujo']).toMatchObject({ type: 'navigate', screen_id: 'flujo.guia' });
    expect(screen.actions['abrir_instancia']).toMatchObject({ type: 'navigate', screen_id: 'flujo.avance' });
  });
});

describe.each(WORKFLOW_IDS)('guía paso a paso: %s', (workflowId) => {
  const workflow = WorkflowCatalog.find(workflowId)!;

  it.each(ROLES_TO_CHECK)('para %s muestra una pestaña numerada por paso', (role) => {
    const screen = GuideChecks.build(role, 'flujo.guia', workflowId);
    const tabs = GuideChecks.components(screen.root).find((component) => component.type === 'tabs');
    const labels = (tabs?.children ?? []).map((tab) => tab.props?.['label']);

    expect(labels).toEqual(workflow.steps.map((step, index) => `${index + 1}. ${step.title}`));
  });

  it.each(ROLES_TO_CHECK)('para %s solo ofrece pantallas que ese rol puede ver', (role) => {
    for (const destino of GuideChecks.destinations(GuideChecks.build(role, 'flujo.guia', workflowId))) {
      expect(RoleAccess.canSee(role, destino), destino).toBe(true);
    }
  });

  it('usa ids de componente únicos y toda acción apunta a una acción registrada', () => {
    for (const role of ROLES_TO_CHECK) {
      const screen = GuideChecks.build(role, 'flujo.guia', workflowId);
      const components = GuideChecks.components(screen.root);
      const ids = components.map((component) => component.id);

      expect(new Set(ids).size, role).toBe(ids.length);
      for (const component of components) {
        for (const actionId of Object.values(component.on ?? {})) {
          expect(Object.keys(screen.actions), `${role}: ${actionId}`).toContain(actionId);
        }
      }
    }
  });

  it('el superusuario ve todas las pantallas de todos los pasos y cada paso enseña sus reglas', () => {
    const screen = GuideChecks.build('superusuario', 'flujo.guia', workflowId);
    const destinos = GuideChecks.destinations(screen);
    const json = JSON.stringify(screen.root);

    for (const step of workflow.steps) {
      for (const screenId of step.screens) expect(destinos).toContain(screenId);
      for (const rule of step.rules) expect(json).toContain(rule);
    }
  });

  it('para un rol sin pantallas en un paso explica que lo hacen otros roles', () => {
    const screen = GuideChecks.build('administrador', 'flujo.guia', workflowId);

    expect(JSON.stringify(screen.root)).toContain('lo realizan otros roles');
  });
});

describe('guía sin flujo elegido', () => {
  it('avisa y ofrece volver a la lista', () => {
    const screen = GuideChecks.build('gestor', 'flujo.guia');
    const components = GuideChecks.components(screen.root);

    expect(components.some((component) => component.type === 'banner')).toBe(true);
    expect(components.some((component) => component.type === 'button')).toBe(true);
    expect(components.some((component) => component.type === 'tabs')).toBe(false);
  });
});

import { ROLES, type SessionRole } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { COMPONENT_TYPES } from '@sdui/sdui-enums.js';
import type { RawComponent, RawScreen } from '@sdui-builder/raw-json.types.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import '@screens/index.js';

class ScreenJsonChecks {
  public static components(component: RawComponent): RawComponent[] {
    return [component, ...(component.children ?? []).flatMap((child) => ScreenJsonChecks.components(child))];
  }

  public static build(role: SessionRole, screenId: string): RawScreen {
    return ScreenFactory.createById(screenId, ScreenContextBuilder.forUser({ id: 'u1', rol: role }));
  }
}

const SESSION_ROLES: SessionRole[] = ['direccion', 'gestor', 'lider', 'auditor', 'dueno_proceso', 'superusuario', 'administrador'];

const CASES = SESSION_ROLES.flatMap((role) => ROLES[role].screens.map((screenId) => ({ role, screenId })));

describe.each(CASES)('JSON de $screenId para $role', ({ role, screenId }) => {
  const screen = ScreenJsonChecks.build(role, screenId);
  const components = ScreenJsonChecks.components(screen.root);
  const actionIds = Object.keys(screen.actions);
  const ruleIds = (screen.rules ?? []).map((rule) => rule.id);

  it('identifica la pantalla y sobrevive a la serialización', () => {
    expect(screen.screen_id).toBe(screenId);
    expect(screen.context.user.rol).toBe(role);
    expect(JSON.parse(JSON.stringify(screen))).toEqual(screen);
  });

  it('usa ids de componente únicos y tipos del contrato', () => {
    const ids = components.map((component) => component.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const component of components) {
      expect(COMPONENT_TYPES).toContain(component.type);
    }
  });

  it('todo evento on apunta a una acción existente', () => {
    for (const component of components) {
      for (const actionId of Object.values(component.on ?? {})) {
        expect(actionIds, `${component.id} -> ${actionId}`).toContain(actionId);
      }
    }
  });

  it('toda acción navigate apunta a una pantalla visible para el rol', () => {
    for (const action of Object.values(screen.actions).filter((candidate) => candidate.type === 'navigate')) {
      expect(ROLES[role].screens).toContain(action.screen_id);
    }
  });

  it('las reglas referenciadas existen y los ids de regla no se repiten', () => {
    expect(new Set(ruleIds).size).toBe(ruleIds.length);
    for (const action of Object.values(screen.actions)) {
      for (const ruleId of action.requires_rules ?? []) expect(ruleIds).toContain(ruleId);
      for (const chained of [action.on_success, action.on_error]) {
        if (chained !== undefined) expect(actionIds).toContain(chained);
      }
    }
    for (const component of components) {
      for (const ruleId of component.validations ?? []) expect(ruleIds).toContain(ruleId);
    }
  });

  it('las transiciones usan acciones y reglas existentes', () => {
    for (const transition of screen.state_machine?.transitions ?? []) {
      expect(actionIds).toContain(transition.action);
      for (const ruleId of transition.requires ?? []) expect(ruleIds).toContain(ruleId);
    }
  });

  it.skipIf(role === 'superusuario')('tiene a lo sumo un botón primario', () => {
    const primarios = components.filter((component) => component.type === 'button' && component.props?.['variant'] === 'primary');

    expect(primarios.length).toBeLessThanOrEqual(1);
  });
});

describe('pantalla inicio', () => {
  const build = (role: SessionRole) => ScreenJsonChecks.build(role, 'inicio');
  const secciones = (role: SessionRole) =>
    ScreenJsonChecks.components(build(role).root)
      .filter((component) => component.type === 'section')
      .map((component) => component.id);

  it.each(SESSION_ROLES)('sigue la estructura de tablero para %s: encabezado, indicadores, en curso y agenda', (role) => {
    const root = build(role).root;
    const ids = (root.children ?? []).map((child) => child.id);

    expect(ids).toEqual(['encabezado', 'conteos', 'seccion_en_curso', 'seccion_agenda']);
    expect(secciones(role)).toEqual(['seccion_en_curso', 'seccion_agenda']);
  });

  it.each(SESSION_ROLES)('los indicadores de %s llevan ícono', (role) => {
    const kpis = ScreenJsonChecks.components(build(role).root).filter((component) => component.type === 'kpi');

    expect(kpis.length).toBeGreaterThan(0);
    for (const kpi of kpis) {
      expect(kpi.props?.['icon'], kpi.id).toBeDefined();
    }
  });

  it.each(SESSION_ROLES)('no repite la navegación de la barra lateral para %s', (role) => {
    const botones = ScreenJsonChecks.components(build(role).root).filter((component) => component.type === 'button');

    expect(botones.length).toBeLessThanOrEqual(1);
    for (const boton of botones) {
      expect(boton.props?.['variant']).toBe('primary');
    }
  });

  it.each(SESSION_ROLES)('solo navega a pantallas que %s puede ver', (role) => {
    const destinos = Object.values(build(role).actions)
      .filter((action) => action.type === 'navigate')
      .map((action) => action.screen_id);

    for (const destino of destinos) {
      expect(ROLES[role].screens, destino).toContain(destino);
    }
  });
});

describe('barra lateral (shell.navegacion)', () => {
  const items = (role: SessionRole) =>
    ScreenJsonChecks.components(ScreenJsonChecks.build(role, 'shell.navegacion').root).filter(
      (component) => component.type === 'button' && component.props?.['display'] === 'nav' && component.props?.['locked'] !== true,
    );

  it.each(SESSION_ROLES)('lista Inicio y solo las pantallas que %s puede ver, sin las que necesitan un registro', (role) => {
    const destinos = items(role)
      .map((component) => component.props?.['target'])
      .sort();
    const esperados = ['inicio', 'flujo.lista', ...ROLES[role].screens.filter((id) => id !== 'inicio' && id !== 'acceso.login' && id !== 'usuario.editar')].sort();

    expect(destinos).toEqual(esperados);
  });

  it('cada destino trae título, ícono y una acción de navegación', () => {
    const screen = ScreenJsonChecks.build('superusuario', 'shell.navegacion');

    for (const item of items('superusuario')) {
      expect(item.props?.['label'], item.id).not.toBe('');
      expect(item.props?.['icon'], item.id).toBeDefined();
      expect(screen.actions[item.on?.['press'] as string]?.type, item.id).toBe('navigate');
    }
  });

  it('es visible para todos los roles aunque no figure en sus pantallas', () => {
    for (const role of SESSION_ROLES) {
      expect(RoleAccess.canSee(role, 'shell.navegacion')).toBe(true);
      expect(ROLES[role].screens).not.toContain('shell.navegacion');
    }
  });
});

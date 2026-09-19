import { ROLES, type RoleKey } from '@shared/roles.js';
import { ScreenAccessError } from '@auth-roles/screen-access-error.js';
import { RuleBuilder } from '@sdui-builder/rule-builder.js';
import { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { AccionesScreen } from '@testing-screens/acciones.test-screen.js';
import { AprobarProgramaScreen } from '@testing-screens/aprobar-programa.test-screen.js';

describe('ScreenFactory', () => {
  it('omite las acciones sin permiso y los componentes y transiciones que las usan', () => {
    const screen = ScreenFactory.create(AccionesScreen, ScreenContextBuilder.forUser({ id: 'u3', rol: 'auditor' }));

    expect(Object.keys(screen.actions)).toEqual(['verificar']);
    expect(screen.root.children?.map((child) => child.id)).toEqual(['btn_verificar']);
    expect(screen.state_machine?.transitions?.map((transition) => transition.action)).toEqual(['verificar']);
  });

  it('genera el JSON completo para un rol con todos los permisos de la pantalla', () => {
    const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'direccion' }).entity({
      type: 'PROGRAMA',
      id: 'p1',
      version: 1,
      estado: 'borrador',
    });

    const screen = ScreenFactory.create(AprobarProgramaScreen, context);

    expect(screen.screen_id).toBe('programa.aprobar');
    expect(screen.version).toBe('1.0');
    expect(screen.subtitle).toBe('Programa anual');
    expect(Object.keys(screen.actions)).toEqual(['aprobar', 'devolver']);
    expect(screen.actions['aprobar']).toEqual({ type: 'submit', method: 'POST', endpoint: '/programas/aprobar' });
    expect(screen.root.children?.map((child) => child.id)).toEqual(['resumen', 'btn_aprobar', 'btn_devolver']);
    expect(screen.rules?.[0]).toEqual({
      id: 'PROGRAMA_BORRADOR',
      when: { field: 'entity.estado', op: 'eq', value: 'borrador' },
      message: 'El programa debe estar en borrador',
      severity: 'block',
    });
    expect(screen.state_machine?.transitions).toHaveLength(2);
    expect(screen.context.user.rol).toBe('direccion');
  });

  it('rechaza la pantalla a un rol que no la puede ver', () => {
    const context = ScreenContextBuilder.forUser({ id: 'u2', rol: 'auditor' });

    expect(() => ScreenFactory.create(AprobarProgramaScreen, context)).toThrow(ScreenAccessError);
  });

  it('crea por screen_id registrado y falla si no existe', () => {
    const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'direccion' });

    expect(ScreenFactory.createById('programa.aprobar', context).title).toBe('Aprobar programa');
    expect(() => ScreenFactory.createById('no.existe', context)).toThrow();
  });

  it('exige context y root al construir una pantalla', () => {
    expect(() => ScreenBuilder.of('inicio', 'Inicio').build()).toThrow();
  });

  it('exige when, message y severity al construir una regla', () => {
    expect(() => RuleBuilder.of('R1').build()).toThrow();
  });
});

describe('ROLES', () => {
  const keys = Object.keys(ROLES) as RoleKey[];

  it('define los roles del diagrama y los de administración con código único', () => {
    expect(keys).toEqual(['direccion', 'gestor', 'lider', 'auditor', 'dueno_proceso', 'sistema', 'administrador', 'superusuario']);
    expect(new Set(keys.map((key) => ROLES[key].code)).size).toBe(keys.length);
  });

  it('no repite permisos ni pantallas dentro de un rol', () => {
    for (const key of keys) {
      expect(new Set(ROLES[key].actions).size).toBe(ROLES[key].actions.length);
      expect(new Set(ROLES[key].screens).size).toBe(ROLES[key].screens.length);
    }
  });

  it('el sistema no tiene pantallas y todos los demás sí', () => {
    expect(ROLES.sistema.screens).toHaveLength(0);
    for (const key of keys.filter((role) => role !== 'sistema')) {
      expect(ROLES[key].screens.length).toBeGreaterThan(0);
    }
  });
});

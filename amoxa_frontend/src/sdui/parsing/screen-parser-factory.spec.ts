import { SduiFixtures } from '@sdui-testing/sdui-fixtures';
import { ScreenParserFactory } from '@sdui-parsing/screen-parser-factory';
import { ComponentTraverser } from '@sdui-traversal/component-traverser';
import { ACTION_TYPES, COMPONENT_TYPES, USER_ROLES } from '@sdui-model/sdui-enums';

describe('ScreenParserFactory', () => {
  const result = ScreenParserFactory.create().parseScreen(SduiFixtures.rawScreen());

  it('parsea el JSON representativo del servidor sin errores', () => {
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.value?.screenId).toBe('programa.editar');
    expect(result.value?.meta?.etag).toBe('abc');
  });

  it('el fixture usa todos los tipos de componente del contrato', () => {
    const screen = SduiFixtures.screen();
    const seen = new Set<string>();
    new ComponentTraverser().walk(screen.root, (component) => seen.add(component.type));

    expect(COMPONENT_TYPES.filter((type) => !seen.has(type))).toEqual([]);
  });

  it('el fixture usa todos los tipos de acción del contrato', () => {
    const screen = SduiFixtures.screen();
    const seen = new Set(Object.values(screen.actions).map((action) => action.type));

    expect(ACTION_TYPES.filter((type) => !seen.has(type))).toEqual([]);
  });

  it('parsea contexto, reglas, state_machine y offline', () => {
    const screen = SduiFixtures.screen();

    expect(screen.context.user.rol).toBe('gestor');
    expect(screen.context.entity).toMatchObject({ id: 'p1', version: 4, estado: 'borrador' });
    expect(screen.context.offline).toMatchObject({ enabled: true, cacheTtlSeconds: 3600, conflictPolicy: 'manual' });
    expect(screen.rules?.map((rule) => rule.severity)).toEqual(['block', 'warn', 'info']);
    expect(screen.stateMachine?.transitions?.[0]).toMatchObject({ action: 'guardar', roles: ['gestor', 'direccion'] });
  });

  it('parsea eventos, validaciones y acciones con todos sus campos', () => {
    const screen = SduiFixtures.screen();
    const periodo = new ComponentTraverser().findById(screen.root, 'periodo');

    expect(periodo?.events?.change).toBe('aplicar_filtros');
    expect(periodo?.validations).toEqual(['PERIODO_VACIO']);
    expect(periodo?.required).toBe(true);
    expect(screen.actions['guardar']).toMatchObject({
      method: 'PUT',
      idempotencyKey: 'prog-{entity.id}-guardar',
      ifVersion: 4,
      requiresRules: ['PERIODO_VACIO'],
      onSuccess: 'avisar',
      onError: 'avisar_error',
    });
    expect(screen.actions['confirmar'].confirmText).toBe('¿Cerrar el programa?');
  });

  it('el contrato acepta el rol lider y el tipo chart', () => {
    expect(USER_ROLES).toContain('lider');
    const screen = SduiFixtures.screen((raw) => {
      (raw['context'] as { user: { rol: string } }).user.rol = 'lider';
    });
    expect(screen.context.user.rol).toBe('lider');
    expect(new ComponentTraverser().findById(screen.root, 'grafica')?.type).toBe('chart');
  });

  it('acumula errores por ruta con un JSON inválido', () => {
    const invalid = ScreenParserFactory.create().parseScreen({ version: '1.0', screen_id: 'x', title: 'X', context: {}, root: {}, actions: {} });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });
});

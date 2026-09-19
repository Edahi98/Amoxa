import { NavGate } from '@shared-workflow/nav-gate.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { NavegacionScreenProvider } from '@flujos-screens/navegacion-screen.provider.js';
import '@screens/index.js';

describe('menú lateral según el avance del flujo', () => {
  it('abre los pasos hechos y el actual, bloquea los 2 siguientes y oculta el resto', () => {
    const states = NavGate.states(NavGate.allScreens(), 0);

    expect(states[NavGate.key('plantilla.lista')]).toBe('abierta');
    expect(states[NavGate.key('ejecucion.checklist')]).toBe('bloqueada');
    expect(states[NavGate.key('informe.ver')]).toBe('bloqueada');
    expect(states[NavGate.key('accion.lista')]).toBe('oculta');
    expect(states[NavGate.key('dashboard.programa')]).toBe('oculta');
  });

  it('al avanzar cambia la ventana: lo anterior queda abierto y aparecen los siguientes', () => {
    const states = NavGate.states(NavGate.allScreens(), 2);

    expect(states[NavGate.key('plantilla.lista')]).toBe('abierta');
    expect(states[NavGate.key('informe.ver')]).toBe('abierta');
    expect(states[NavGate.key('accion.lista')]).toBe('bloqueada');
    expect(states[NavGate.key('dashboard.programa')]).toBe('bloqueada');
    expect(NavGate.states(NavGate.allScreens(), 4)[NavGate.key('dashboard.programa')]).toBe('abierta');
  });

  it('las pantallas fuera de los pasos del flujo no se controlan', () => {
    expect(NavGate.isGated('usuario.lista')).toBe(false);
    expect(NavGate.isGated('flujo.lista')).toBe(false);
    expect(NavGate.states(['usuario.lista'], 0)).toEqual({});
  });

  describe('datos de la barra', () => {
    const provider = (list: unknown[], locked = true) =>
      new NavegacionScreenProvider({ list: async () => list } as never, { isLocked: async () => locked } as never);
    const request = (role: string) => ({ screenId: 'shell.navegacion', user: { sub: 'u', organizacionId: 'o' }, role }) as never;
    const view = (state: string, current: string | null, steps: string[]) => ({
      progress: { state, currentStepId: current, steps: steps.map((id) => ({ id })) },
    });
    const ids = ['plantillas', 'ejecucion', 'informe', 'acciones', 'analisis'];

    it('sin flujos iniciados solo está abierto el primer paso', async () => {
      const { data } = await provider([]).load(request('gestor'));

      expect((data!.nav as Record<string, string>)[NavGate.key('plantilla.lista')]).toBe('abierta');
      expect((data!.nav as Record<string, string>)[NavGate.key('ejecucion.checklist')]).toBe('bloqueada');
    });

    it('sigue el paso en curso del flujo más reciente y desbloquea al concluir', async () => {
      const running = await provider([view('en_curso', 'informe', ids)]).load(request('gestor'));
      const done = await provider([view('concluido', null, ids)]).load(request('gestor'));

      expect((running.data!.nav as Record<string, string>)[NavGate.key('informe.ver')]).toBe('abierta');
      expect((running.data!.nav as Record<string, string>)[NavGate.key('accion.lista')]).toBe('bloqueada');
      expect(Object.values(done.data!.nav as Record<string, string>).every((state) => state === 'abierta')).toBe(true);
    });

    it('el superusuario con el bloqueo apagado lo ve todo abierto', async () => {
      const { data } = await provider([], false).load(request('superusuario'));

      expect(Object.values(data!.nav as Record<string, string>).every((state) => state === 'abierta')).toBe(true);
      expect(data!.menu).toEqual({ bloqueo: false });
    });

    it('el bloqueo apagado no afecta a los demás roles', async () => {
      const { data } = await provider([], false).load(request('gestor'));

      expect((data!.nav as Record<string, string>)[NavGate.key('accion.lista')]).toBe('oculta');
    });

    it('el superusuario también ve el bloqueo, sin flujos iniciados', async () => {
      const { data } = await provider([]).load(request('superusuario'));
      const nav = data!.nav as Record<string, string>;

      expect(nav[NavGate.key('plantilla.lista')]).toBe('abierta');
      expect(nav[NavGate.key('ejecucion.checklist')]).toBe('bloqueada');
      expect(nav[NavGate.key('accion.lista')]).toBe('oculta');
    });
  });

  describe('pantalla', () => {
    it('solo el superusuario recibe el interruptor y su acción', () => {
      const su = ScreenFactory.createById('shell.navegacion', ScreenContextBuilder.forUser({ id: 'u1', rol: 'superusuario' }));
      const gestor = ScreenFactory.createById('shell.navegacion', ScreenContextBuilder.forUser({ id: 'u2', rol: 'gestor' }));

      expect(JSON.stringify(su.root)).toContain('"id":"bloqueo_menu"');
      expect(su.actions['cambiar_bloqueo']).toMatchObject({ type: 'call_api', method: 'PUT', endpoint: '/flujos/menu/bloqueo' });
      expect(JSON.stringify(gestor.root)).not.toContain('bloqueo_menu');
    });

    it('cada grupo del flujo se resume en una sola fila bloqueada y se oculta cuando todo está oculto', () => {
      const screen = ScreenFactory.createById('shell.navegacion', ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' }));
      const json = JSON.stringify(screen.root);

      expect(json).toContain('"locked":true');
      expect(json).toContain('data.nav.plantilla_lista');
      expect(json).toContain('data.nav.accion_lista');
      expect(json).toContain('"id":"item_ir_programa_lista"');
      expect(json.match(/"locked":true/g)!.length).toBeLessThanOrEqual(7);
      expect(json).toContain('se desbloquea al avanzar');
    });
  });
});

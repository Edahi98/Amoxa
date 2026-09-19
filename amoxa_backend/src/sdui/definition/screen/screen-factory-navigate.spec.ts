import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';

@ScreenDecorator.of({ screenId: 'plantilla.lista', title: 'Plantillas' })
class NavegacionScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, _role: RoleKey): void {
    builder
      .action('ir_editar', ActionBuilder.of('navigate').screen('programa.editar'))
      .action('ir_inicio', ActionBuilder.of('navigate').screen('inicio'))
      .root(
        ComponentBuilder.of('container', 'root').children(
          ComponentBuilder.of('button', 'btn_editar').on('press', 'ir_editar'),
          ComponentBuilder.of('button', 'btn_inicio').on('press', 'ir_inicio'),
        ),
      )
      .stateMachine(StateMachineBuilder.create().transition('editado', 'ir_editar').transition('otro', 'ir_inicio'));
  }
}

describe('poda de acciones navigate', () => {
  it('elimina la acción, el componente y la transición si el rol no ve la pantalla destino', () => {
    const screen = ScreenFactory.create(NavegacionScreen, ScreenContextBuilder.forUser({ id: 'u1', rol: 'lider' }));

    expect(Object.keys(screen.actions)).toEqual(['ir_inicio']);
    expect(screen.root.children?.map((child) => child.id)).toEqual(['btn_inicio']);
    expect(screen.state_machine?.transitions?.map((transition) => transition.action)).toEqual(['ir_inicio']);
  });

  it('conserva la navegación hacia pantallas que el rol sí ve', () => {
    const screen = ScreenFactory.create(NavegacionScreen, ScreenContextBuilder.forUser({ id: 'u2', rol: 'gestor' }));

    expect(Object.keys(screen.actions)).toEqual(['ir_editar', 'ir_inicio']);
    expect(screen.root.children?.map((child) => child.id)).toEqual(['btn_editar', 'btn_inicio']);
  });

  it('toma el estado actual de la máquina desde la entidad del contexto', () => {
    const context = ScreenContextBuilder.forUser({ id: 'u1', rol: 'gestor' }).entity({
      type: 'PLANTILLA',
      id: 'p1',
      version: 1,
      estado: 'borrador',
    });

    expect(ScreenFactory.create(NavegacionScreen, context).state_machine?.current).toBe('borrador');
  });
});

import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';

@ScreenDecorator.of({ screenId: 'accion.lista', title: 'Acciones' })
export class AccionesScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    builder
      .root(
        ComponentBuilder.of('list', 'root').children(
          ComponentBuilder.of('button', 'btn_todas').on('press', 'ver_todas'),
          ComponentBuilder.of('button', 'btn_verificar').on('press', 'verificar'),
        ),
      )
      .stateMachine(StateMachineBuilder.create().transition('cerrada', 'verificar').transition('abierta', 'ver_todas'));
  }

  @ActionDecorator.of({ id: 'ver_todas', permission: 'accion.consultar_todas' })
  public verTodas(): ActionBuilder {
    return ActionBuilder.of('refresh');
  }

  @ActionDecorator.of({ id: 'verificar', permission: 'accion.verificar_eficacia' })
  public verificar(): ActionBuilder {
    return ActionBuilder.of('submit').request('POST', '/acciones/verificar');
  }
}

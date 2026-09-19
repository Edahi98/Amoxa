import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import { RuleBuilder } from '@sdui-builder/rule-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';

@ScreenDecorator.of({ screenId: 'programa.aprobar', title: 'Aprobar programa', subtitle: 'Programa anual' })
export class AprobarProgramaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    builder
      .root(
        ComponentBuilder.of('section', 'root').children(
          ComponentBuilder.of('text', 'resumen').props({ rol: role }),
          ComponentBuilder.of('button', 'btn_aprobar').on('press', 'aprobar'),
          ComponentBuilder.of('button', 'btn_devolver').on('press', 'devolver'),
        ),
      )
      .rule(
        RuleBuilder.of('PROGRAMA_BORRADOR')
          .when(ConditionBuilder.field('entity.estado', 'eq', 'borrador'))
          .message('El programa debe estar en borrador')
          .severity('block'),
      )
      .stateMachine(
        StateMachineBuilder.create()
          .current('borrador')
          .transition('aprobado', 'aprobar', { roles: ['direccion'] })
          .transition('borrador', 'devolver'),
      );
  }

  @ActionDecorator.of({ id: 'aprobar', permission: 'programa.aprobar' })
  public aprobar(): ActionBuilder {
    return ActionBuilder.of('submit').request('POST', '/programas/aprobar');
  }

  @ActionDecorator.of({ id: 'devolver', permission: 'programa.devolver' })
  public devolver(): ActionBuilder {
    return ActionBuilder.of('submit').request('POST', '/programas/devolver');
  }
}

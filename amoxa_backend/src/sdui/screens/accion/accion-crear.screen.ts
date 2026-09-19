import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'accion.crear', title: 'Crear acción', subtitle: 'Acción correctiva para una no conformidad' })
export class AccionCrearScreen extends ScreenDefinition {
  private responsables: OptionSpec[] = [];

  public prepare(context: ScreenContextBuilder): void {
    const opciones = context.build().data?.['opciones'] as { responsables?: OptionSpec[] } | undefined;
    this.responsables = opciones?.responsables ?? [];
  }

  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'accion.cierre', 'accion.lista');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.findingCard('hallazgo', 'hallazgo', 'nc_menor'),
          UiKit.banner(
            'aviso',
            'info',
            'Todos los campos son obligatorios. El sistema le avisa 7 y 1 día antes de la fecha límite, y al vencer avisa al responsable y al gestor.',
          ),
          UiKit.section(
            'datos',
            'Acción correctiva',
            UiKit.textarea('correccion', 'Corrección', 'accion.correccion').required().validations('CORRECCION_VACIA'),
            UiKit.textarea('causa_raiz', 'Causa raíz', 'accion.causa_raiz').required().validations('CAUSA_RAIZ_VACIA'),
            UiKit.personPicker('responsable', 'Responsable', 'accion.responsable_id', this.responsables).required().validations('RESPONSABLE_VACIO'),
            UiKit.dateInput('fecha_limite', 'Fecha límite', 'accion.fecha_limite').required().validations('FECHA_LIMITE_VACIA'),
            UiKit.boundText('dias_restantes', 'accion.dias_restantes', '', 'caption', 'muted'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_crear', 'Registrar acción', 'primary', 'crear_accion'),
            UiKit.navButton('accion.cierre', 'Reportar cierre', 'outline'),
            UiKit.navButton('accion.lista', 'Volver a acciones', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('CORRECCION_VACIA', 'accion.correccion', 'Describa la corrección.'))
      .rule(RuleKit.required('CAUSA_RAIZ_VACIA', 'accion.causa_raiz', 'Indique la causa raíz.'))
      .rule(RuleKit.required('RESPONSABLE_VACIO', 'accion.responsable_id', 'Elija al responsable.'))
      .rule(RuleKit.required('FECHA_LIMITE_VACIA', 'accion.fecha_limite', 'Indique la fecha límite.'))
      .stateMachine(
        StateMachineBuilder.create().transition('abierta', 'crear_accion', {
          roles: ['dueno_proceso'],
          requires: ['CORRECCION_VACIA', 'CAUSA_RAIZ_VACIA', 'RESPONSABLE_VACIO', 'FECHA_LIMITE_VACIA'],
        }),
      );
  }

  @ActionDecorator.of({ id: 'crear_accion', permission: 'accion.crear' })
  public crearAccion(): ActionBuilder {
    return ActionKit.submit(
      'POST',
      '/hallazgos/{entity.id}/acciones',
      'CORRECCION_VACIA',
      'CAUSA_RAIZ_VACIA',
      'RESPONSABLE_VACIO',
      'FECHA_LIMITE_VACIA',
    );
  }
}

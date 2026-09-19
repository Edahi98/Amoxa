import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'programa.aprobar', title: 'Aprobar programa', subtitle: 'Decisión de la dirección sobre el programa' })
export class ProgramaAprobarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    builder.action('ir_programa_lista', ActionKit.navigate('programa.lista', { estado: 'vigente' }));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner(
            'aviso',
            'info',
            'Al aprobar queda constancia de quién lo hizo y cuándo, y el gestor recibe el aviso. Si devuelve el programa debe explicar el motivo.',
          ),
          UiKit.card(
            'resumen',
            'Resumen del programa',
            UiKit.boundText('periodo', 'programa.periodo', '', 'heading'),
            UiKit.boundText('objetivos', 'programa.objetivos'),
            UiKit.boundText('riesgos', 'programa.riesgos'),
            UiKit.boundText('procesos', 'programa.procesos_prioritarios', '', 'caption', 'muted'),
          ),
          UiKit.card(
            'constancia',
            'Constancia de aprobación',
            UiKit.boundText('aprobado_por', 'programa.aprobado_por'),
            UiKit.boundText('aprobado_en', 'programa.aprobado_en', '', 'caption', 'muted'),
          ).visibleIf(ConditionBuilder.field('programa.aprobado_en', 'not_empty')),
          UiKit.textarea('motivo', 'Motivo de la devolución', 'decision.motivo_devolucion').validations('DEVOLVER_SIN_MOTIVO'),
          UiKit.row(
            'acciones',
            UiKit.button('btn_aprobar', 'Aprobar programa', 'primary', 'aprobar'),
            UiKit.button('btn_devolver', 'Devolver al gestor', 'danger', 'devolver'),
            UiKit.button('btn_documento', 'Descargar programa (.docx)', 'outline', 'descargar_documento'),
            UiKit.navButton('programa.lista', 'Volver a programas', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.stateIsNot('PROGRAMA_NO_PENDIENTE', 'pendiente_aprobacion', 'Solo se puede decidir sobre un programa pendiente de aprobación.'))
      .rule(RuleKit.required('DEVOLVER_SIN_MOTIVO', 'decision.motivo_devolucion', 'Explique por qué devuelve el programa.'))
      .stateMachine(
        StateMachineBuilder.create()
          .transition('aprobado', 'aprobar', { roles: ['direccion'], requires: ['PROGRAMA_NO_PENDIENTE'] })
          .transition('devuelto', 'devolver', { roles: ['direccion'], requires: ['PROGRAMA_NO_PENDIENTE', 'DEVOLVER_SIN_MOTIVO'] }),
      );
  }

  @ActionDecorator.of({ id: 'descargar_documento', permission: 'programa.consultar' })
  public descargarDocumento(): ActionBuilder {
    return ActionKit.callApi('GET', '/programas/{entity.id}/documento');
  }

  @ActionDecorator.of({ id: 'aprobar', permission: 'programa.aprobar' })
  public aprobar(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/aprobar', 'PROGRAMA_NO_PENDIENTE')
      .confirmText('Se registrará su aprobación con la fecha y hora actuales.')
      .onSuccess('ir_programa_lista');
  }

  @ActionDecorator.of({ id: 'devolver', permission: 'programa.devolver' })
  public devolver(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/devolver', 'PROGRAMA_NO_PENDIENTE', 'DEVOLVER_SIN_MOTIVO');
  }
}

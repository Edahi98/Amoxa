import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'accion.cierre', title: 'Reportar cierre', subtitle: 'Prueba de que la acción se ejecutó' })
export class AccionCierreScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'accion.verificar', 'accion.lista');
    builder.action('descargar_documento', ActionKit.callApi('GET', '/acciones/{entity.id}/documento'));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.actionCard('accion', 'accion'),
          UiKit.banner('aviso', 'info', 'Sin prueba no se puede reportar el cierre. El auditor verificador recibe un aviso al reportarlo.'),
          UiKit.section(
            'cierre',
            'Cierre de la acción',
            UiKit.evidenceCapture('evidencias', 'Prueba de ejecución', 'accion.evidencias').required().validations('ACCION_SIN_EVIDENCIA'),
            UiKit.textarea('comentario', 'Comentario', 'accion.comentario_cierre'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_reportar', 'Reportar cierre', 'primary', 'reportar_cierre'),
            UiKit.button('btn_documento', 'Descargar formulario (.docx)', 'outline', 'descargar_documento'),
            UiKit.navButton('accion.verificar', 'Verificar eficacia', 'outline'),
            UiKit.navButton('accion.lista', 'Volver a acciones', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('ACCION_SIN_EVIDENCIA', 'accion.evidencias', 'No se puede reportar el cierre sin adjuntar la prueba.'))
      .stateMachine(
        StateMachineBuilder.create().transition('reportada', 'reportar_cierre', {
          roles: ['dueno_proceso'],
          requires: ['ACCION_SIN_EVIDENCIA'],
        }),
      );
  }

  @ActionDecorator.of({ id: 'reportar_cierre', permission: 'accion.reportar_cierre' })
  public reportarCierre(): ActionBuilder {
    return ActionKit.submit('POST', '/acciones/{entity.id}/cierre', 'ACCION_SIN_EVIDENCIA');
  }
}

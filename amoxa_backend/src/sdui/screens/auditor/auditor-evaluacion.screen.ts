import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditor.evaluacion', title: 'Registrar evaluación', subtitle: 'Evaluación de la competencia del auditor' })
export class AuditorEvaluacionScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'auditor.ficha', 'auditor.lista');
    builder.action(ActionKit.navId('auditor.ficha'), ActionKit.navigate('auditor.ficha', { entityId: '{entity.id}' }));
    builder.action('descargar_documento', ActionKit.callApi('GET', '/auditores/{entity.id}/evaluaciones/{data.evaluacion.ultima_id}/documento'));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'evaluacion',
            'Evaluación de competencia',
            UiKit.banner('aviso', 'info', 'Aplique al menos dos métodos de evaluación. Al terminar, el sistema indica si el auditor queda apto y hasta cuándo.'),
            UiKit.multiselect(
              'metodos',
              'Métodos de evaluación aplicados',
              'evaluacion.metodos',
              [
                UiKit.option('revision_registros', 'Revisión de registros'),
                UiKit.option('entrevista', 'Entrevista'),
                UiKit.option('observacion', 'Observación en campo'),
                UiKit.option('examen', 'Examen'),
                UiKit.option('retroalimentacion', 'Retroalimentación'),
                UiKit.option('testimonios', 'Testimonios'),
              ],
            )
              .required()
              .validations('METODOS_INSUFICIENTES'),
            UiKit.select(
              'resultado',
              'Resultado de la evaluación',
              'evaluacion.resultado',
              [UiKit.option('satisfactorio', 'Satisfactorio'), UiKit.option('no_satisfactorio', 'No satisfactorio')],
            )
              .required()
              .validations('RESULTADO_VACIO'),
            UiKit.textarea('observaciones', 'Observaciones', 'evaluacion.observaciones'),
          ),
          UiKit.card(
            'dictamen',
            'Dictamen del sistema',
            UiKit.boundText('apto', 'auditor.apto'),
            UiKit.boundText('vigencia', 'auditor.vigencia_hasta', '', 'caption', 'muted').visibleIf(
              ConditionBuilder.field('auditor.vigencia_hasta', 'not_empty'),
            ),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_registrar', 'Registrar evaluación', 'primary', 'registrar_evaluacion'),
            UiKit.button('btn_documento', 'Descargar último registro (.docx)', 'outline', 'descargar_documento').visibleIf(
              ConditionBuilder.field('evaluacion.ultima_id', 'not_empty'),
            ),
            UiKit.navButton('auditor.ficha', 'Ver ficha del auditor', 'outline'),
            UiKit.navButton('auditor.lista', 'Volver a auditores', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.minItems('METODOS_INSUFICIENTES', 'evaluacion.metodos', 2, 'Debe aplicar al menos dos métodos de evaluación.'))
      .rule(RuleKit.required('RESULTADO_VACIO', 'evaluacion.resultado', 'Indique el resultado de la evaluación.'));
  }

  @ActionDecorator.of({ id: 'registrar_evaluacion', permission: 'auditor.evaluar' })
  public registrarEvaluacion(): ActionBuilder {
    return ActionKit.submit('POST', '/auditores/{entity.id}/evaluaciones', 'METODOS_INSUFICIENTES', 'RESULTADO_VACIO');
  }
}

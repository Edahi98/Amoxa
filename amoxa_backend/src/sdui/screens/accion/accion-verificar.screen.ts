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

@ScreenDecorator.of({ screenId: 'accion.verificar', title: 'Verificar eficacia', subtitle: 'Verificación de acciones reportadas' })
export class AccionVerificarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'accion.lista');
    builder.action('descargar_documento', ActionKit.callApi('GET', '/acciones/{entity.id}/documento'));
    const noEficaz = ConditionBuilder.field('verificacion.eficaz', 'ne', true);
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.actionCard('accion', 'accion'),
          UiKit.banner(
            'aviso',
            'info',
            'No puede verificar acciones de las que usted es responsable. Si la acción no fue eficaz, se reabre con una nueva fecha.',
          ),
          UiKit.section(
            'verificacion',
            'Verificación de eficacia',
            UiKit.toggle('eficaz', 'La acción fue eficaz', 'verificacion.eficaz'),
            UiKit.evidenceCapture('evidencias', 'Evidencia de la verificación', 'verificacion.evidencias')
              .required()
              .validations('EFICACIA_SIN_EVIDENCIA'),
            UiKit.textarea('comentario', 'Comentario', 'verificacion.comentario'),
            UiKit.dateInput('nueva_fecha', 'Nueva fecha límite', 'verificacion.nueva_fecha')
              .visibleIf(noEficaz)
              .validations('NUEVA_FECHA_REQUERIDA'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_eficaz', 'Declarar eficaz', 'primary', 'declarar_eficaz').visibleIf(
              ConditionBuilder.field('verificacion.eficaz', 'eq', true),
            ),
            UiKit.button('btn_reabrir', 'Reabrir acción', 'danger', 'reabrir_accion').visibleIf(noEficaz),
            UiKit.button('btn_documento', 'Descargar formulario (.docx)', 'outline', 'descargar_documento'),
            UiKit.navButton('accion.lista', 'Volver a acciones', 'ghost'),
          ),
        ),
      )
      .rule(
        RuleKit.flagTrue(
          'VERIFICADOR_ES_RESPONSABLE',
          'accion.verificador_es_responsable',
          'No puede verificar una acción de la que usted es responsable.',
        ),
      )
      .rule(RuleKit.required('EFICACIA_SIN_EVIDENCIA', 'verificacion.evidencias', 'Adjunte la evidencia de la verificación.'))
      .rule(
        RuleKit.requiredIf(
          'NUEVA_FECHA_REQUERIDA',
          ConditionBuilder.field('verificacion.eficaz', 'ne', true),
          'verificacion.nueva_fecha',
          'Una acción no eficaz se reabre con una nueva fecha límite.',
        ),
      )
      .rule(RuleKit.stateIsNot('ACCION_NO_REPORTADA', 'reportada', 'Solo se puede verificar una acción reportada.'))
      .stateMachine(
        StateMachineBuilder.create()
          .transition('verificada', 'declarar_eficaz', {
            roles: ['auditor'],
            requires: ['VERIFICADOR_ES_RESPONSABLE', 'EFICACIA_SIN_EVIDENCIA', 'ACCION_NO_REPORTADA'],
          })
          .transition('reabierta', 'reabrir_accion', {
            roles: ['auditor'],
            requires: ['VERIFICADOR_ES_RESPONSABLE', 'EFICACIA_SIN_EVIDENCIA', 'NUEVA_FECHA_REQUERIDA', 'ACCION_NO_REPORTADA'],
          }),
      );
  }

  @ActionDecorator.of({ id: 'declarar_eficaz', permission: 'accion.verificar_eficacia' })
  public declararEficaz(): ActionBuilder {
    return ActionKit.submit(
      'POST',
      '/acciones/{entity.id}/verificacion',
      'VERIFICADOR_ES_RESPONSABLE',
      'EFICACIA_SIN_EVIDENCIA',
      'ACCION_NO_REPORTADA',
    );
  }

  @ActionDecorator.of({ id: 'reabrir_accion', permission: 'accion.verificar_eficacia' })
  public reabrirAccion(): ActionBuilder {
    return ActionKit.submit(
      'POST',
      '/acciones/{entity.id}/reapertura',
      'VERIFICADOR_ES_RESPONSABLE',
      'EFICACIA_SIN_EVIDENCIA',
      'NUEVA_FECHA_REQUERIDA',
      'ACCION_NO_REPORTADA',
    );
  }
}

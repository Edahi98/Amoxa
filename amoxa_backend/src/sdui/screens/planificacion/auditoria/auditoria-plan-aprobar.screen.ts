import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditoria.plan_aprobar', title: 'Aprobar plan', subtitle: 'Respuesta del área auditada al plan' })
export class AuditoriaPlanAprobarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'ejecucion.apertura', 'auditoria.lista');
    builder.action('descargar_plan', ActionKit.callApi('GET', '/auditorias/{entity.id}/plan/documento'));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner('aviso', 'info', 'Puede aprobar el plan o proponer otra fecha. El líder ve su respuesta de inmediato.'),
          UiKit.auditCard('resumen', 'auditoria'),
          UiKit.section(
            'plan',
            'Plan propuesto',
            UiKit.gantt('cronograma', 'plan.cronograma'),
            UiKit.boundText('agenda', 'plan.agenda'),
          ),
          UiKit.section(
            'propuesta',
            'Proponer otra fecha',
            UiKit.dateInput('fecha_propuesta', 'Fecha propuesta', 'plan.fecha_propuesta').validations('PROPUESTA_SIN_FECHA'),
            UiKit.textarea('motivo', 'Motivo del cambio', 'plan.motivo_propuesta'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_aprobar', 'Aprobar plan', 'primary', 'aprobar_plan'),
            UiKit.button('btn_proponer', 'Proponer otra fecha', 'outline', 'proponer_fecha'),
            UiKit.button('btn_doc_plan', 'Descargar plan (.docx)', 'outline', 'descargar_plan'),
            UiKit.navButton('ejecucion.apertura', 'Reunión de apertura', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('PROPUESTA_SIN_FECHA', 'plan.fecha_propuesta', 'Indique la fecha que propone.'));
  }

  @ActionDecorator.of({ id: 'aprobar_plan', permission: 'auditoria.aprobar_plan' })
  public aprobarPlan(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/plan/aprobacion');
  }

  @ActionDecorator.of({ id: 'proponer_fecha', permission: 'auditoria.aprobar_plan' })
  public proponerFecha(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/plan/propuesta', 'PROPUESTA_SIN_FECHA');
  }
}

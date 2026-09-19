import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditoria.plan', title: 'Plan de auditoría', subtitle: 'Agenda y reparto de tareas del equipo' })
export class AuditoriaPlanScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'auditoria.plan_aprobar', 'ejecucion.apertura', 'auditoria.lista');
    builder.action('descargar_plan', ActionKit.callApi('GET', '/auditorias/{entity.id}/plan/documento'));
    builder.action('descargar_notificacion', ActionKit.callApi('GET', '/auditorias/{entity.id}/notificacion/documento'));
    const contenido: ComponentBuilder[] =
      role === 'lider'
        ? [
            UiKit.row(
              'fechas',
              UiKit.dateInput('fecha_inicio', 'Inicio', 'plan.fecha_inicio').required().validations('PLAN_SIN_FECHAS'),
              UiKit.dateInput('fecha_fin', 'Fin', 'plan.fecha_fin').required().validations('PLAN_SIN_FECHAS'),
            ),
            UiKit.textarea('agenda', 'Agenda', 'plan.agenda').required().validations('PLAN_SIN_AGENDA'),
            UiKit.textarea('tareas', 'Reparto de tareas al equipo', 'plan.tareas').required().validations('PLAN_SIN_TAREAS'),
          ]
        : [
            UiKit.boundText('agenda', 'plan.agenda'),
            UiKit.boundText('tareas', 'plan.tareas'),
          ];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.auditCard('resumen', 'auditoria'),
          UiKit.section('plan', role === 'lider' ? 'Elaborar plan' : 'Plan de la auditoría', UiKit.gantt('cronograma', 'plan.cronograma'), ...contenido),
          UiKit.row(
            'acciones',
            UiKit.button('btn_enviar', 'Enviar plan al área auditada', 'primary', 'enviar_plan'),
            UiKit.button('btn_guardar', 'Guardar plan', 'outline', 'guardar_plan'),
            UiKit.button('btn_doc_plan', 'Descargar plan (.docx)', 'outline', 'descargar_plan'),
            UiKit.button('btn_doc_notificacion', 'Descargar notificación (.docx)', 'outline', 'descargar_notificacion'),
            UiKit.navButton('auditoria.plan_aprobar', 'Aprobar plan', 'outline'),
            UiKit.navButton('ejecucion.apertura', 'Reunión de apertura', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.anyEmpty('PLAN_SIN_FECHAS', ['plan.fecha_inicio', 'plan.fecha_fin'], 'Indique las fechas de inicio y fin del plan.'))
      .rule(RuleKit.required('PLAN_SIN_AGENDA', 'plan.agenda', 'El plan necesita una agenda.'))
      .rule(RuleKit.required('PLAN_SIN_TAREAS', 'plan.tareas', 'Reparta las tareas entre los integrantes del equipo.'));
  }

  @ActionDecorator.of({ id: 'guardar_plan', permission: 'auditoria.elaborar_plan' })
  public guardarPlan(): ActionBuilder {
    return ActionKit.submit('PUT', '/auditorias/{entity.id}/plan');
  }

  @ActionDecorator.of({ id: 'enviar_plan', permission: 'auditoria.elaborar_plan' })
  public enviarPlan(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/plan/envio', 'PLAN_SIN_FECHAS', 'PLAN_SIN_AGENDA', 'PLAN_SIN_TAREAS').confirmText(
      'El plan se enviará al área auditada.',
    );
  }
}

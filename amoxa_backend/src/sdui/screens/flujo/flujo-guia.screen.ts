import { ROLES, type RoleKey } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { WorkflowCatalog } from '@shared-workflow/workflow-catalog.js';
import type { WorkflowStep } from '@shared-workflow/workflows.js';
import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'flujo.guia', title: 'Flujo de trabajo', subtitle: 'Paso a paso' })
export class FlujoGuiaScreen extends ScreenDefinition {
  private workflowId: string | undefined;
  private auditorias: OptionSpec[] = [];

  public prepare(context: ScreenContextBuilder): void {
    const built = context.build();
    this.workflowId = built.entity?.id;
    const opciones = built.data?.['opciones'] as { auditorias?: OptionSpec[] } | undefined;
    this.auditorias = opciones?.auditorias ?? [];
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    const workflow = WorkflowCatalog.find(this.workflowId);
    ActionKit.registerNavigation(builder, 'flujo.lista', 'flujo.avance');
    builder.action('abrir_instancia', ActionKit.navigate('flujo.avance', { entityId: '{data.id}' }));
    if (workflow === undefined) {
      builder.root(
        UiKit.page(
          'root',
          UiKit.banner('sin_flujo', 'warning', 'Elija un flujo de trabajo de la lista para ver sus pasos.'),
          UiKit.row('acciones', UiKit.navButton('flujo.lista', 'Ver flujos de trabajo', 'primary')),
        ),
      );
      return;
    }

    const reachable = workflow.steps.flatMap((step) => step.screens).filter((screenId) => RoleAccess.canSee(role, screenId));
    ActionKit.registerNavigation(builder, ...new Set(reachable));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'encabezado',
            workflow.title,
            UiKit.text('resumen', workflow.summary, 'body', 'muted'),
            UiKit.tabs(
              'pasos',
              `paso_${workflow.steps[0].id}`,
              ...workflow.steps.map((step, index) => FlujoGuiaScreen.step(step, index, role)),
            ),
          ),
          this.startSection(),
          UiKit.row('acciones', UiKit.navButton('flujo.lista', 'Volver a flujos de trabajo', 'ghost')),
        ),
      )
      .rule(RuleKit.required('INICIO_SIN_AUDITORIA', 'inicio.auditoria_id', 'Elija la auditoría sobre la que va a trabajar.'));
  }

  @ActionDecorator.of({ id: 'iniciar_flujo', permission: 'sesion.entrar' })
  public iniciarFlujo(): ActionBuilder {
    return ActionKit.callApi('POST', '/flujos/{entity.id}/instancias', 'INICIO_SIN_AUDITORIA')
      .payload({ auditoriaId: '{data.inicio.auditoria_id}' })
      .onSuccess('abrir_instancia');
  }

  private startSection(): ComponentBuilder {
    return UiKit.section(
      'iniciar',
      'Iniciar este flujo',
      UiKit.text(
        'iniciar_texto',
        'Elija la auditoría sobre la que va a trabajar. Cada paso se marca solo cuando el sistema registra el trabajo, sin que tenga que avisar.',
        'body',
        'muted',
      ),
      this.auditorias.length === 0
        ? UiKit.text('sin_auditorias', 'No hay auditorías disponibles para iniciar este flujo.', 'body', 'muted')
        : UiKit.select('auditoria', 'Auditoría', 'inicio.auditoria_id', this.auditorias, { placeholder: 'Elija una auditoría' })
            .required()
            .validations('INICIO_SIN_AUDITORIA'),
      ...(this.auditorias.length === 0 ? [] : [UiKit.button('btn_iniciar', 'Iniciar flujo', 'primary', 'iniciar_flujo')]),
    );
  }

  private static step(step: WorkflowStep, index: number, role: RoleKey): ComponentBuilder {
    const screens = step.screens.filter((screenId) => RoleAccess.canSee(role, screenId));
    return UiKit.tab(
      `paso_${step.id}`,
      `${index + 1}. ${step.title}`,
      UiKit.row(
        `participan_${step.id}`,
        UiKit.text(`participan_texto_${step.id}`, 'Participan:', 'label'),
        ...step.roles.map((participant) => UiKit.badge(`rol_${step.id}_${participant}`, ROLES[participant].label, 'neutral')),
        UiKit.badge(`clausula_${step.id}`, `Cláusula ${step.clause}`, 'primary'),
      ),
      UiKit.text(`descripcion_${step.id}`, step.summary),
      UiKit.section(
        `tareas_${step.id}`,
        'Qué se hace',
        UiKit.list(
          `lista_${step.id}`,
          '',
          ...step.tasks.map((task, position) => UiKit.text(`tarea_${step.id}_${position}`, `${position + 1}. ${task}`)),
        ),
      ),
      ...step.rules.map((rule, position) => UiKit.banner(`regla_${step.id}_${position}`, 'info', rule, 'Regla del sistema')),
      UiKit.section(
        `ir_${step.id}`,
        'Ir a la pantalla',
        screens.length === 0
          ? UiKit.text(`sin_acceso_${step.id}`, 'Este paso lo realizan otros roles; su rol no tiene pantallas en esta etapa.', 'body', 'muted')
          : UiKit.row(
              `botones_${step.id}`,
              ...screens.map((screenId, position) => UiKit.navButton(screenId, undefined, position === 0 ? 'primary' : 'outline')),
            ),
      ),
    );
  }
}

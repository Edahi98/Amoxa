import type { RoleKey } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { WorkflowCatalog } from '@shared-workflow/workflow-catalog.js';
import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ScreenRegistry } from '@sdui-registry/screen-registry.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { ScreenCatalog } from '@sdui-kit/screen-catalog.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'flujo.avance', title: 'Avance del flujo', subtitle: 'Se actualiza solo con su trabajo' })
export class FlujoAvanceScreen extends ScreenDefinition {
  private static readonly PLANTILLA_ENTITY = 'avance.plantilla_id';
  private static readonly AUDITORIA_ENTITY = 'avance.auditoria_id';
  private static readonly AUDIT_SCREENS: readonly string[] = ['ejecucion', 'hallazgo', 'informe', 'auditoria'];

  private workflowId: string | undefined;

  public prepare(context: ScreenContextBuilder): void {
    const avance = context.build().data?.['avance'] as { flujo_id?: string } | undefined;
    this.workflowId = avance?.flujo_id;
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    const workflow = WorkflowCatalog.find(this.workflowId);
    ActionKit.registerNavigation(builder, 'flujo.lista');
    builder.action('actualizar', ActionKit.refresh());
    if (workflow === undefined) {
      builder.root(
        UiKit.page(
          'root',
          UiKit.banner('sin_flujo', 'warning', 'No se encontró el flujo. Vuelva a la lista de flujos de trabajo.'),
          UiKit.row('acciones', UiKit.navButton('flujo.lista', 'Ver flujos de trabajo', 'primary')),
        ),
      );
      return;
    }

    const stepButtons = workflow.steps.map((step) => {
      const screens = step.screens.filter((screenId) => RoleAccess.canSee(role, screenId));
      for (const screenId of screens) {
        builder.action(FlujoAvanceScreen.actionId(screenId), ActionKit.navigate(screenId, FlujoAvanceScreen.entityParams(screenId)));
      }
      return UiKit.row(
        `siguiente_${step.id}`,
        ...screens.map((screenId, position) =>
          UiKit.button(`btn_${FlujoAvanceScreen.actionId(screenId)}`, ScreenRegistry.titleOf(screenId), position === 0 ? 'primary' : 'outline', FlujoAvanceScreen.actionId(screenId)).props({
            icon: ScreenCatalog.of(screenId).icon,
          }),
        ),
      ).visibleIf(ConditionBuilder.field('avance.paso_actual', 'eq', step.id));
    });

    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'resumen',
          workflow.title,
          UiKit.boundText('auditoria', 'avance.auditoria', '', 'body', 'muted'),
          UiKit.progress('progreso', 'Avance del flujo', 'avance.porcentaje'),
          UiKit.boundText('estado', 'avance.estado', '', 'label'),
        ),
        UiKit.section(
          'pasos',
          'Pasos',
          UiKit.table('tabla_pasos', 'Pasos del flujo y su estado', 'Este flujo no tiene pasos.', 'avance.pasos', [
            { key: 'paso', label: 'Paso' },
            {
              key: 'estado',
              label: 'Estado',
              kind: 'badge',
              tones: { Completado: 'success', 'En curso': 'primary', Pendiente: 'neutral' },
            },
            { key: 'detalle', label: 'Qué sigue' },
          ]),
        ),
        UiKit.section('siguiente', 'Siguiente paso', UiKit.boundText('detalle_actual', 'avance.detalle_actual', '', 'body'), ...stepButtons),
        UiKit.row(
          'cierre',
          UiKit.button('btn_concluir', 'Concluir flujo', 'primary', 'concluir_flujo').visibleIf(
            ConditionBuilder.field('avance.puede_concluir', 'eq', true),
          ),
          UiKit.button('btn_actualizar', 'Actualizar avance', 'outline', 'actualizar'),
          UiKit.navButton('flujo.lista', 'Volver a flujos de trabajo', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'concluir_flujo', permission: 'sesion.entrar' })
  public concluirFlujo(): ActionBuilder {
    return ActionKit.callApi('POST', '/flujos/instancias/{entity.id}/concluir').payload({}).onSuccess('actualizar');
  }

  private static actionId(screenId: string): string {
    return `avance_${screenId.replaceAll('.', '_')}`;
  }

  private static entityParams(screenId: string): Record<string, unknown> | undefined {
    const family = screenId.split('.')[0];
    if (family === 'plantilla') return { entityId: `{data.${FlujoAvanceScreen.PLANTILLA_ENTITY}}` };
    if (FlujoAvanceScreen.AUDIT_SCREENS.includes(family)) return { entityId: `{data.${FlujoAvanceScreen.AUDITORIA_ENTITY}}` };
    return undefined;
  }
}

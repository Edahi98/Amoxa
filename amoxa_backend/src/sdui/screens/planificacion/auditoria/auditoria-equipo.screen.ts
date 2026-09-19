import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { ScreenOptionsReader } from '@screens-planificacion/screen-options-reader.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditoria.equipo', title: 'Asignar equipo', subtitle: 'Equipo auditor de la auditoría' })
export class AuditoriaEquipoScreen extends ScreenDefinition {
  private auditores: OptionSpec[] = [];

  public override prepare(context: ScreenContextBuilder): void {
    this.auditores = ScreenOptionsReader.read(context, 'auditores');
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'auditoria.plan', 'auditoria.lista');
    const contenido: ComponentBuilder[] =
      role === 'gestor'
        ? [
            UiKit.banner(
              'aviso',
              'warning',
              'Quienes auditen su propia área o tengan la competencia vencida aparecen marcados con el motivo y no se pueden seleccionar. El intento queda registrado.',
            ),
            UiKit.personPicker('miembros', 'Auditores del equipo', 'equipo.miembros', this.auditores, true)
              .required()
              .validations('EQUIPO_VACIO', 'EQUIPO_CON_CONFLICTO'),
          ]
        : [
            UiKit.banner('aviso', 'info', 'El gestor asigna el equipo. Aquí puede consultarlo.'),
            UiKit.list('miembros', 'Todavía no se ha asignado el equipo.').bind('equipo.miembros'),
          ];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section('equipo', 'Equipo auditor', ...contenido),
          UiKit.row(
            'acciones',
            UiKit.button('btn_asignar', 'Asignar equipo', 'primary', 'asignar_equipo'),
            UiKit.navButton('auditoria.plan', 'Elaborar plan', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('EQUIPO_VACIO', 'equipo.miembros', 'Elija al menos un auditor para el equipo.'))
      .rule(RuleKit.when('EQUIPO_CON_CONFLICTO', ConditionBuilder.field('equipo.conflictos', 'not_empty'), 'El equipo incluye personas que no pueden participar.'));
  }

  @ActionDecorator.of({ id: 'asignar_equipo', permission: 'auditoria.asignar_equipo' })
  public asignarEquipo(): ActionBuilder {
    return ActionKit.submit('PUT', '/auditorias/{entity.id}/equipo', 'EQUIPO_VACIO', 'EQUIPO_CON_CONFLICTO');
  }
}

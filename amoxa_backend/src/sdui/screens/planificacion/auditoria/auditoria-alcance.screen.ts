import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
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

@ScreenDecorator.of({ screenId: 'auditoria.alcance', title: 'Alcance, criterios y método', subtitle: 'Definición del alcance de la auditoría' })
export class AuditoriaAlcanceScreen extends ScreenDefinition {
  private procesos: OptionSpec[] = [];
  private plantillas: OptionSpec[] = [];

  public override prepare(context: ScreenContextBuilder): void {
    this.procesos = ScreenOptionsReader.read(context, 'procesos');
    this.plantillas = ScreenOptionsReader.read(context, 'plantillas');
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'auditoria.contacto', 'auditoria.equipo', 'auditoria.lista');
    const contenido: ComponentBuilder[] =
      role === 'lider'
        ? [
            UiKit.processPicker('procesos', 'Procesos a auditar', 'auditoria.procesos', this.procesos, true)
              .required()
              .validations('ALCANCE_SIN_PROCESOS'),
            UiKit.clausePicker('criterios', 'Criterios de auditoría', 'auditoria.criterios', true)
              .required()
              .validations('CRITERIOS_VACIOS'),
            UiKit.select('plantilla', 'Plantilla de checklist vigente', 'auditoria.plantilla_id', this.plantillas, {
              hint: 'Solo se pueden elegir plantillas vigentes.',
            })
              .required()
              .validations('PLANTILLA_NO_VIGENTE'),
            UiKit.radioGroup(
              'metodo',
              'Método de auditoría',
              'auditoria.metodo',
              [UiKit.option('in_situ', 'Presencial'), UiKit.option('remoto', 'Remoto'), UiKit.option('mixto', 'Mixto')],
              { direction: 'row' },
            )
              .required()
              .validations('METODO_VACIO'),
          ]
        : [
            UiKit.boundText('procesos', 'auditoria.procesos_texto'),
            UiKit.boundText('criterios', 'auditoria.criterios_texto'),
            UiKit.boundText('plantilla', 'auditoria.plantilla_nombre'),
            UiKit.boundText('metodo', 'auditoria.metodo_texto'),
          ];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.auditCard('resumen', 'auditoria'),
          UiKit.section('definicion', role === 'lider' ? 'Definir alcance' : 'Alcance definido por el líder', ...contenido),
          UiKit.row(
            'acciones',
            UiKit.button('btn_definir', 'Guardar alcance', 'primary', 'definir_alcance'),
            UiKit.button('btn_revisar', 'Marcar como revisado', 'primary', 'revisar_alcance'),
            UiKit.navButton('auditoria.contacto', 'Contacto y viabilidad', 'outline'),
            UiKit.navButton('auditoria.equipo', 'Asignar equipo', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('ALCANCE_SIN_PROCESOS', 'auditoria.procesos', 'Elija al menos un proceso a auditar.'))
      .rule(RuleKit.required('CRITERIOS_VACIOS', 'auditoria.criterios', 'Elija los criterios contra los que se audita.'))
      .rule(
        RuleKit.when(
          'PLANTILLA_NO_VIGENTE',
          ConditionBuilder.any(
            ConditionBuilder.field('auditoria.plantilla_id', 'empty'),
            ConditionBuilder.field('auditoria.plantilla_estado', 'ne', 'publicada'),
          ),
          'Solo se pueden usar plantillas vigentes.',
        ),
      )
      .rule(RuleKit.required('METODO_VACIO', 'auditoria.metodo', 'Indique si la auditoría será presencial, remota o mixta.'));
  }

  @ActionDecorator.of({ id: 'definir_alcance', permission: 'auditoria.definir_alcance' })
  public definirAlcance(): ActionBuilder {
    return ActionKit.submit(
      'PUT',
      '/auditorias/{entity.id}/alcance',
      'ALCANCE_SIN_PROCESOS',
      'CRITERIOS_VACIOS',
      'PLANTILLA_NO_VIGENTE',
      'METODO_VACIO',
    );
  }

  @ActionDecorator.of({ id: 'revisar_alcance', permission: 'auditoria.revisar_alcance' })
  public revisarAlcance(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/alcance/revision');
  }
}

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

@ScreenDecorator.of({ screenId: 'plantilla.publicar', title: 'Publicar versión', subtitle: 'Cobertura de ISO 9001 y requisitos propios' })
export class PlantillaPublicarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'plantilla.lista', 'plantilla.editar');
    builder.action(ActionKit.navId('plantilla.editar'), ActionKit.navigate('plantilla.editar', { entityId: '{entity.id}' }));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.card(
            'cobertura',
            'Cobertura de la plantilla',
            UiKit.boundText('nombre', 'plantilla.nombre', '', 'heading'),
            UiKit.boundText('faltantes', 'plantilla.cobertura.faltantes', '', 'body', 'warning'),
            UiKit.banner('falta_iso', 'warning', 'Faltan preguntas que cubran ISO 9001.', 'Cobertura de ISO 9001').visibleIf(
              ConditionBuilder.field('plantilla.cobertura.iso9001', 'ne', true),
            ),
            UiKit.banner('falta_propios', 'warning', 'Faltan preguntas que cubran los requisitos propios.', 'Requisitos propios').visibleIf(
              ConditionBuilder.field('plantilla.cobertura.propios', 'ne', true),
            ),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_publicar', 'Publicar versión', 'primary', 'publicar'),
            UiKit.button('btn_formato', 'Descargar formato (.docx)', 'outline', 'descargar_formato').visibleIf(
              ConditionBuilder.field('entity.id', 'not_empty'),
            ),
            UiKit.navButton('plantilla.editar', 'Volver al editor', 'outline'),
            UiKit.navButton('plantilla.lista', 'Volver a plantillas', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.flagFalse('COBERTURA_ISO_FALTANTE', 'plantilla.cobertura.iso9001', 'La plantilla no cubre ISO 9001.'))
      .rule(RuleKit.flagFalse('COBERTURA_PROPIOS_FALTANTE', 'plantilla.cobertura.propios', 'La plantilla no cubre los requisitos propios.'))
      .rule(RuleKit.stateIsNot('PLANTILLA_NO_BORRADOR', 'borrador', 'Solo se puede publicar una plantilla en borrador.'))
      .stateMachine(
        StateMachineBuilder.create().transition('publicada', 'publicar', {
          roles: ['gestor'],
          requires: ['COBERTURA_ISO_FALTANTE', 'COBERTURA_PROPIOS_FALTANTE', 'PLANTILLA_NO_BORRADOR'],
        }),
      );
  }

  @ActionDecorator.of({ id: 'descargar_formato', permission: 'plantilla.consultar' })
  public descargarFormato(): ActionBuilder {
    return ActionKit.callApi('GET', '/plantillas/{entity.id}/formato');
  }

  @ActionDecorator.of({ id: 'publicar', permission: 'plantilla.publicar' })
  public publicar(): ActionBuilder {
    return ActionKit.submit(
      'POST',
      '/plantillas/{entity.id}/publicar',
      'COBERTURA_ISO_FALTANTE',
      'COBERTURA_PROPIOS_FALTANTE',
      'PLANTILLA_NO_BORRADOR',
    ).confirmText('Al publicar, la plantilla queda vigente y ya no se edita.');
  }
}

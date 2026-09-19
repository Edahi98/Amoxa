import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'plantilla.editar', title: 'Editor de checklist', subtitle: 'Preguntas con cláusula y tipo de criterio' })
export class PlantillaEditarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'plantilla.publicar', 'plantilla.lista');
    builder.action(ActionKit.navId('plantilla.publicar'), ActionKit.navigate('plantilla.publicar', { entityId: '{entity.id}' }));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'datos',
            'Datos de la plantilla',
            UiKit.textInput('nombre', 'Nombre de la plantilla', 'plantilla.nombre').required(),
          ),
          UiKit.section(
            'pregunta_nueva',
            'Nueva pregunta',
            UiKit.textarea('texto', 'Texto de la pregunta', 'pregunta.texto').required().validations('PREGUNTA_INCOMPLETA'),
            UiKit.clausePicker('clausula', 'Cláusula que cubre', 'pregunta.clausula').required().validations('PREGUNTA_INCOMPLETA'),
            UiKit.radioGroup(
              'criterio',
              'Tipo de criterio',
              'pregunta.criterio',
              [UiKit.option('norma', 'Norma'), UiKit.option('procedimiento', 'Procedimiento')],
              { direction: 'row' },
            )
              .required()
              .validations('PREGUNTA_INCOMPLETA'),
          ),
          UiKit.section(
            'preguntas_seccion',
            'Preguntas de la plantilla',
            UiKit.list('preguntas', 'La plantilla todavía no tiene preguntas.').bind('plantilla.preguntas'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_agregar', 'Agregar pregunta', 'primary', 'agregar_pregunta'),
            UiKit.button('btn_proponer', 'Proponer pregunta', 'primary', 'proponer_pregunta'),
            UiKit.button('btn_crear', 'Crear plantilla', 'outline', 'crear_plantilla').visibleIf(
              ConditionBuilder.field('entity.id', 'empty'),
            ),
            UiKit.button('btn_guardar', 'Guardar plantilla', 'outline', 'guardar_plantilla').visibleIf(
              ConditionBuilder.field('entity.id', 'not_empty'),
            ),
            UiKit.button('btn_formato', 'Descargar formato (.docx)', 'outline', 'descargar_formato').visibleIf(
              ConditionBuilder.field('entity.id', 'not_empty'),
            ),
            UiKit.navButton('plantilla.publicar', 'Ir a publicar', 'ghost'),
            UiKit.navButton('plantilla.lista', 'Volver a plantillas', 'ghost'),
          ),
        ),
      )
      .rule(
        RuleKit.anyEmpty(
          'PREGUNTA_INCOMPLETA',
          ['pregunta.texto', 'pregunta.clausula', 'pregunta.criterio'],
          'Cada pregunta necesita su texto, la cláusula que cubre y el tipo de criterio.',
        ),
      );
  }

  @ActionDecorator.of({ id: 'descargar_formato', permission: 'plantilla.consultar' })
  public descargarFormato(): ActionBuilder {
    return ActionKit.callApi('GET', '/plantillas/{entity.id}/formato');
  }

  @ActionDecorator.of({ id: 'crear_plantilla', permission: 'plantilla.crear' })
  public crearPlantilla(): ActionBuilder {
    return ActionKit.submit('POST', '/plantillas');
  }

  @ActionDecorator.of({ id: 'guardar_plantilla', permission: 'plantilla.editar' })
  public guardarPlantilla(): ActionBuilder {
    return ActionKit.submit('PUT', '/plantillas/{entity.id}');
  }

  @ActionDecorator.of({ id: 'agregar_pregunta', permission: 'plantilla.editar' })
  public agregarPregunta(): ActionBuilder {
    return ActionKit.submit('POST', '/plantillas/{entity.id}/preguntas', 'PREGUNTA_INCOMPLETA');
  }

  @ActionDecorator.of({ id: 'proponer_pregunta', permission: 'plantilla.proponer' })
  public proponerPregunta(): ActionBuilder {
    return ActionKit.submit('POST', '/plantillas/{entity.id}/propuestas', 'PREGUNTA_INCOMPLETA');
  }
}

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
    builder.action('actualizar_pantalla', ActionKit.refresh());
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
          UiKit.section(
            'orden_seccion',
            'Orden de las preguntas',
            UiKit.sortableList('orden_preguntas', 'Preguntas de la plantilla', 'orden.preguntas', {
              emptyText: 'La plantilla todavía no tiene preguntas.',
              hint: 'Arrastre cada pregunta para cambiar su lugar, o use los botones de subir y bajar. El orden se guarda solo.',
            }).on('change', 'guardar_orden'),
          ).visibleIf(
            ConditionBuilder.all(ConditionBuilder.field('entity.id', 'not_empty'), ConditionBuilder.field('entity.estado', 'eq', 'borrador')),
          ),
          UiKit.section(
            'importar_seccion',
            'Importar preguntas desde un archivo',
            UiKit.text(
              'importar_ayuda',
              'Suba un .docx, .xlsx o .pdf con el checklist. Las preguntas detectadas quedan como propuestas para que las revise antes de aceptarlas.',
              'body',
              'muted',
            ),
            UiKit.fileInput('importar_archivo', 'Archivo', 'importar.archivo', {
              accept: '.docx,.xlsx,.pdf',
              maxBytes: 5 * 1024 * 1024,
              hint: 'Word, Excel o PDF de hasta 5 MB.',
            }),
            UiKit.clausePicker('importar_clausula', 'Cláusula por omisión', 'importar.clausula'),
            UiKit.radioGroup(
              'importar_criterio',
              'Tipo de criterio',
              'importar.criterio',
              [UiKit.option('norma', 'Norma'), UiKit.option('procedimiento', 'Procedimiento')],
              { direction: 'row' },
            ),
            UiKit.button('btn_importar', 'Importar preguntas', 'outline', 'importar_preguntas'),
          ).visibleIf(ConditionBuilder.field('entity.id', 'not_empty')),
          UiKit.section(
            'propuestas_seccion',
            'Propuestas pendientes',
            UiKit.text('propuestas_ayuda', 'Pulse una propuesta para aceptarla como pregunta de la plantilla.', 'body', 'muted'),
            UiKit.list('propuestas', 'No hay propuestas pendientes.').bind('propuestas').on('press', 'aceptar_propuesta'),
            UiKit.row(
              'propuestas_acciones',
              UiKit.button('btn_aceptar_todas', 'Aceptar todas', 'outline', 'aceptar_todas'),
              UiKit.button('btn_rechazar_todas', 'Rechazar todas', 'ghost', 'rechazar_todas'),
            ),
          ).visibleIf(ConditionBuilder.field('entity.id', 'not_empty')),
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
          'IMPORTAR_INCOMPLETO',
          ['importar.archivo', 'importar.clausula', 'importar.criterio'],
          'Elija el archivo, la cláusula por omisión y el tipo de criterio.',
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
    return ActionKit.submit('POST', '/plantillas/{entity.id}/preguntas', 'PREGUNTA_INCOMPLETA').onSuccess('actualizar_pantalla');
  }

  @ActionDecorator.of({ id: 'guardar_orden', permission: 'plantilla.editar' })
  public guardarOrden(): ActionBuilder {
    return ActionKit.callApi('PUT', '/plantillas/{entity.id}/preguntas/orden');
  }

  @ActionDecorator.of({ id: 'importar_preguntas', permission: 'plantilla.editar' })
  public importarPreguntas(): ActionBuilder {
    return ActionKit.submit('POST', '/plantillas/{entity.id}/importar', 'IMPORTAR_INCOMPLETO').onSuccess('actualizar_pantalla');
  }

  @ActionDecorator.of({ id: 'aceptar_propuesta', permission: 'plantilla.editar' })
  public aceptarPropuesta(): ActionBuilder {
    return ActionKit.callApi('POST', '/plantillas/{entity.id}/propuestas/{params.itemId}/aceptar')
      .payload({})
      .onSuccess('actualizar_pantalla');
  }

  @ActionDecorator.of({ id: 'aceptar_todas', permission: 'plantilla.editar' })
  public aceptarTodas(): ActionBuilder {
    return ActionKit.callApi('POST', '/plantillas/{entity.id}/propuestas/aceptar-todas')
      .payload({})
      .confirmText('Todas las propuestas pendientes pasarán a ser preguntas de la plantilla. ¿Continuar?')
      .onSuccess('actualizar_pantalla');
  }

  @ActionDecorator.of({ id: 'rechazar_todas', permission: 'plantilla.editar' })
  public rechazarTodas(): ActionBuilder {
    return ActionKit.callApi('POST', '/plantillas/{entity.id}/propuestas/rechazar-todas')
      .payload({})
      .confirmText('Se descartarán todas las propuestas pendientes. ¿Continuar?')
      .onSuccess('actualizar_pantalla');
  }

  @ActionDecorator.of({ id: 'proponer_pregunta', permission: 'plantilla.proponer' })
  public proponerPregunta(): ActionBuilder {
    return ActionKit.submit('POST', '/plantillas/{entity.id}/propuestas', 'PREGUNTA_INCOMPLETA');
  }
}

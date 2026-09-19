import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'programa.editar', title: 'Crear o editar programa', subtitle: 'Periodo, objetivos, riesgos y calendario' })
export class ProgramaEditarScreen extends ScreenDefinition {
  private processOptions: OptionSpec[] = [];

  public prepare(context: ScreenContextBuilder): void {
    const options = (context.build().data?.['opciones'] as { procesos?: OptionSpec[] } | undefined)?.procesos;
    this.processOptions = Array.isArray(options) ? options : [];
  }

  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'programa.lista', 'programa.aprobar');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'datos',
            'Datos del programa',
            UiKit.textInput('periodo', 'Periodo', 'programa.periodo', { placeholder: 'Ejemplo: 2026' })
              .required()
              .validations('PROGRAMA_INCOMPLETO'),
            UiKit.textarea('objetivos', 'Objetivos', 'programa.objetivos').required().validations('PROGRAMA_INCOMPLETO'),
            UiKit.textarea('riesgos', 'Riesgos', 'programa.riesgos').required().validations('PROGRAMA_INCOMPLETO'),
            UiKit.row(
              'fechas',
              UiKit.dateInput('fecha_inicio', 'Inicio del calendario', 'programa.fecha_inicio')
                .required()
                .validations('PROGRAMA_INCOMPLETO'),
              UiKit.dateInput('fecha_fin', 'Fin del calendario', 'programa.fecha_fin')
                .required()
                .validations('PROGRAMA_INCOMPLETO'),
            ),
          ),
          UiKit.section(
            'prioridad',
            'Áreas a auditar primero',
            UiKit.banner(
              'aviso_prioridad',
              'info',
              'El sistema propone la prioridad según la importancia de cada proceso y los incumplimientos previos. Puede cambiarla si lo justifica.',
            ),
            UiKit.processPicker('procesos_prioritarios', 'Procesos priorizados', 'programa.procesos_prioritarios', this.processOptions, true),
            UiKit.select('frecuencia', 'Frecuencia de auditoría', 'programa.frecuencia', [
              UiKit.option('Trimestral', 'Trimestral'),
              UiKit.option('Semestral', 'Semestral'),
              UiKit.option('Anual', 'Anual'),
            ]),
            UiKit.toggle('prioridad_modificada', 'Modificar la prioridad sugerida', 'programa.prioridad_modificada'),
            UiKit.textarea('justificacion', 'Justificación del cambio de prioridad', 'programa.justificacion_prioridad')
              .visibleIf(ConditionBuilder.field('programa.prioridad_modificada', 'eq', true))
              .validations('PRIORIDAD_SIN_JUSTIFICACION'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_enviar', 'Enviar a aprobación', 'primary', 'enviar_aprobacion'),
            UiKit.button('btn_crear', 'Guardar como borrador', 'outline', 'crear_programa').visibleIf(
              ConditionBuilder.field('entity.id', 'empty'),
            ),
            UiKit.button('btn_guardar', 'Guardar cambios', 'outline', 'guardar_borrador').visibleIf(
              ConditionBuilder.field('entity.id', 'not_empty'),
            ),
            UiKit.button('btn_documento', 'Descargar programa (.docx)', 'outline', 'descargar_documento').visibleIf(
              ConditionBuilder.field('entity.id', 'not_empty'),
            ),
            UiKit.navButton('programa.aprobar', 'Ir a la aprobación', 'ghost'),
            UiKit.navButton('programa.lista', 'Volver a programas', 'ghost'),
          ),
        ),
      )
      .rule(
        RuleKit.anyEmpty(
          'PROGRAMA_INCOMPLETO',
          ['programa.periodo', 'programa.objetivos', 'programa.riesgos', 'programa.fecha_inicio', 'programa.fecha_fin'],
          'El programa tiene datos incompletos y no se puede enviar a aprobación.',
        ),
      )
      .rule(
        RuleKit.requiredIf(
          'PRIORIDAD_SIN_JUSTIFICACION',
          ConditionBuilder.field('programa.prioridad_modificada', 'eq', true),
          'programa.justificacion_prioridad',
          'Cambiar la prioridad sugerida requiere una justificación.',
        ),
      );
  }

  @ActionDecorator.of({ id: 'descargar_documento', permission: 'programa.consultar' })
  public descargarDocumento(): ActionBuilder {
    return ActionKit.callApi('GET', '/programas/{entity.id}/documento');
  }

  @ActionDecorator.of({ id: 'crear_programa', permission: 'programa.crear' })
  public crearPrograma(): ActionBuilder {
    return ActionKit.submit('POST', '/programas');
  }

  @ActionDecorator.of({ id: 'guardar_borrador', permission: 'programa.editar' })
  public guardarBorrador(): ActionBuilder {
    return ActionKit.submit('PUT', '/programas/{entity.id}');
  }

  @ActionDecorator.of({ id: 'enviar_aprobacion', permission: 'programa.editar' })
  public enviarAprobacion(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/enviar', 'PROGRAMA_INCOMPLETO', 'PRIORIDAD_SIN_JUSTIFICACION')
      .confirmText('El programa se enviará a la dirección para su aprobación.')
      .onSuccess('ir_programa_lista');
  }
}

import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { ScreenDataReader } from '@screens-ejecucion/screen-data-reader.js';

@ScreenDecorator.of({ screenId: 'hallazgo.lista', title: 'Hallazgos', subtitle: 'No conformidades, observaciones y oportunidades' })
export class HallazgoListaScreen extends ScreenDefinition {
  private datos: Record<string, unknown> | undefined;

  public prepare(context: ScreenContextBuilder): void {
    this.datos = context.build().data;
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'ejecucion.evidencia', 'ejecucion.checklist', 'ejecucion.cierre');
    const esNoConformidad = ConditionBuilder.field('hallazgo.tipo', 'in', ['nc_mayor', 'nc_menor']);
    const formulario: ComponentBuilder[] =
      role === 'auditor'
        ? [
            UiKit.select('tipo', 'Tipo de hallazgo', 'hallazgo.tipo', [
              UiKit.option('nc_mayor', 'No conformidad mayor'),
              UiKit.option('nc_menor', 'No conformidad menor'),
              UiKit.option('observacion', 'Observación'),
              UiKit.option('oportunidad', 'Oportunidad de mejora'),
            ]).required(),
            UiKit.select(
              'respuesta',
              'Respuesta del checklist de origen',
              'hallazgo.respuesta_id',
              ScreenDataReader.options(this.datos, 'hallazgo.opciones_respuestas'),
            )
              .required()
              .on('change', 'consultar_evidencia'),
            UiKit.processPicker(
              'proceso',
              'Proceso',
              'hallazgo.proceso',
              ScreenDataReader.options(this.datos, 'hallazgo.opciones_procesos'),
            ),
            UiKit.clausePicker('clausula', 'Cláusula incumplida', 'hallazgo.clausula')
              .visibleIf(esNoConformidad)
              .validations('NC_SIN_CLAUSULA'),
            UiKit.textarea('descripcion', 'Descripción', 'hallazgo.descripcion').required(),
            UiKit.banner(
              'aviso_evidencia',
              'warning',
              'Una no conformidad no se puede guardar sin evidencia verificada. Capture y verifique la evidencia en la respuesta correspondiente.',
              'Falta evidencia verificada',
            ).visibleIf(
              ConditionBuilder.all(esNoConformidad, ConditionBuilder.field('hallazgo.evidencias_verificadas', 'empty')),
            ),
          ]
        : [
            UiKit.findingCard('detalle', 'hallazgo'),
            UiKit.banner('aviso_revision', 'info', 'Revise cada hallazgo y su evidencia antes de la reunión de cierre.'),
            UiKit.textarea('comentario_revision', 'Comentario de la revisión', 'revision.comentario'),
          ];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section('lista', 'Hallazgos registrados', UiKit.list('hallazgos', 'Todavía no hay hallazgos registrados.').bind('hallazgos')),
          UiKit.section('detalle_seccion', role === 'auditor' ? 'Registrar hallazgo' : 'Revisión del hallazgo', ...formulario),
          UiKit.row(
            'acciones',
            UiKit.button('btn_guardar', 'Guardar hallazgo', 'primary', 'guardar_hallazgo'),
            UiKit.button('btn_revisar', 'Marcar como revisado', 'primary', 'revisar_hallazgo'),
            UiKit.button('btn_documento', 'Descargar registro de hallazgos', 'outline', 'descargar_hallazgos'),
            UiKit.navButton('ejecucion.evidencia', 'Capturar evidencia', 'outline'),
            UiKit.navButton('ejecucion.checklist', 'Volver al checklist', 'outline'),
            UiKit.navButton('ejecucion.cierre', 'Reunión de cierre', 'outline'),
          ),
        ),
      )
      .rule(RuleKit.requiredIf('NC_SIN_CLAUSULA', esNoConformidad, 'hallazgo.clausula', 'Una no conformidad debe indicar la cláusula incumplida.'))
      .rule(
        RuleKit.requiredIf(
          'NC_SIN_EVIDENCIA_VERIFICADA',
          esNoConformidad,
          'hallazgo.evidencias_verificadas',
          'No se puede guardar una no conformidad sin evidencia verificada.',
        ),
      );
  }

  @ActionDecorator.of({ id: 'guardar_hallazgo', permission: 'hallazgo.registrar' })
  public guardarHallazgo(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/hallazgos', 'NC_SIN_CLAUSULA', 'NC_SIN_EVIDENCIA_VERIFICADA');
  }

  @ActionDecorator.of({ id: 'consultar_evidencia', permission: 'hallazgo.registrar' })
  public consultarEvidencia(): ActionBuilder {
    return ActionKit.callApi('GET', '/auditorias/{entity.id}/respuestas/{data.hallazgo.respuesta_id}/evidencia-verificada');
  }

  @ActionDecorator.of({ id: 'revisar_hallazgo', permission: 'hallazgo.revisar' })
  public revisarHallazgo(): ActionBuilder {
    return ActionKit.submit('POST', '/hallazgos/{data.hallazgo.id}/revision');
  }

  @ActionDecorator.of({ id: 'descargar_hallazgos', permission: 'sesion.entrar' })
  public descargarHallazgos(): ActionBuilder {
    return ActionKit.callApi('GET', '/auditorias/{entity.id}/hallazgos/documento');
  }
}

import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { ScreenDataReader } from '@screens-ejecucion/screen-data-reader.js';

@ScreenDecorator.of({ screenId: 'ejecucion.checklist', title: 'Checklist', subtitle: 'Respuesta por pregunta, con o sin conexión' })
export class EjecucionChecklistScreen extends ScreenDefinition {
  private datos: Record<string, unknown> | undefined;

  public prepare(context: ScreenContextBuilder): void {
    context.offline({ enabled: true, cache_ttl_seconds: 86400, conflict_policy: 'manual' });
    this.datos = context.build().data;
  }

  public define(builder: ScreenBuilder, _role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'ejecucion.evidencia', 'hallazgo.lista', 'auditoria.lista');
    builder.action('sincronizar', ActionKit.syncNow());
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.row(
            'estado',
            UiKit.syncStatus('sync', 'sync'),
            UiKit.progress('avance', 'Avance del checklist', 'checklist.avance'),
            UiKit.boundText('pendientes', 'checklist.pendientes', '', 'caption', 'muted'),
          ),
          UiKit.section('preguntas', 'Preguntas', ...this.preguntas()),
          UiKit.row(
            'acciones',
            UiKit.button('btn_guardar', 'Guardar respuestas', 'primary', 'guardar_respuestas'),
            UiKit.button('btn_sincronizar', 'Sincronizar ahora', 'outline', 'sincronizar'),
            UiKit.button('btn_documento', 'Descargar lista de verificación', 'outline', 'descargar_documento'),
            UiKit.navButton('ejecucion.evidencia', 'Capturar evidencia', 'outline'),
            UiKit.navButton('hallazgo.lista', 'Registrar hallazgos', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(
        RuleKit.countAbove('CHECKLIST_INCOMPLETO', 'checklist.pendientes', 0, 'Quedan preguntas sin responder.').severity('warn'),
      );
  }

  @ActionDecorator.of({ id: 'guardar_respuestas', permission: 'ejecucion.responder_checklist' })
  public guardarRespuestas(): ActionBuilder {
    return ActionKit.submit('PUT', '/auditorias/{entity.id}/respuestas').optimistic();
  }

  @ActionDecorator.of({ id: 'descargar_documento', permission: 'ejecucion.responder_checklist' })
  public descargarDocumento(): ActionBuilder {
    return ActionKit.callApi('GET', '/auditorias/{entity.id}/checklist/documento');
  }

  private preguntas(): ComponentBuilder[] {
    const items = ScreenDataReader.records(this.datos, 'checklist.preguntas').flatMap((pregunta) => {
      const clave = pregunta['clave'];
      if (typeof clave !== 'string') {
        return [];
      }
      const criterio = pregunta['criterio'] === 'procedimiento' ? 'procedimiento' : 'norma';
      return [
        UiKit.checklistItem(
          `item_${clave}`,
          ScreenDataReader.text(pregunta['texto'], clave),
          ScreenDataReader.text(pregunta['clausula']),
          `respuestas.${clave}`,
          criterio,
          UiKit.evidenceCapture(`evidencia_${clave}`, 'Evidencia', `respuestas.${clave}.evidencias`),
        ).required(),
      ];
    });
    return items.length > 0
      ? items
      : [UiKit.banner('sin_preguntas', 'info', 'La plantilla de esta auditoría todavía no tiene preguntas para responder.')];
  }
}

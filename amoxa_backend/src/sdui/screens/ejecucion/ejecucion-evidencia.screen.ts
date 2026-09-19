import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { ScreenDataReader } from '@screens-ejecucion/screen-data-reader.js';

@ScreenDecorator.of({ screenId: 'ejecucion.evidencia', title: 'Captura de evidencia', subtitle: 'Fotos y documentos de una respuesta' })
export class EjecucionEvidenciaScreen extends ScreenDefinition {
  private datos: Record<string, unknown> | undefined;

  public prepare(context: ScreenContextBuilder): void {
    context.offline({ enabled: true, cache_ttl_seconds: 86400, conflict_policy: 'manual' });
    this.datos = context.build().data;
  }

  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'ejecucion.checklist', 'hallazgo.lista');
    builder.action('sincronizar', ActionKit.syncNow());
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner(
            'aviso',
            'info',
            'Cada archivo queda con fecha y ubicación, y ya no puede alterarse. Sin conexión se guarda en el dispositivo y se sincroniza después.',
          ),
          UiKit.syncStatus('sync', 'sync'),
          UiKit.section(
            'captura',
            'Evidencia de la respuesta',
            UiKit.select(
              'respuesta',
              'Respuesta del checklist',
              'evidencia.respuesta_id',
              ScreenDataReader.options(this.datos, 'evidencia.opciones_respuestas'),
            ).required(),
            UiKit.boundText('pregunta', 'evidencia.pregunta', '', 'heading'),
            UiKit.evidenceCapture('archivos', 'Fotos o documentos', 'evidencia.archivos')
              .required()
              .validations('EVIDENCIA_VACIA'),
            UiKit.geoStamp('ubicacion', 'Ubicación de la captura', 'evidencia.ubicacion'),
            UiKit.toggle('verificada', 'Marcar la evidencia como verificada', 'evidencia.verificada'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_guardar', 'Guardar evidencia', 'primary', 'guardar_evidencia'),
            UiKit.button('btn_capturar', 'Capturar con la cámara', 'outline', 'capturar'),
            UiKit.button('btn_verificar', 'Marcar como verificada', 'outline', 'marcar_verificada'),
            UiKit.button('btn_sincronizar', 'Sincronizar ahora', 'ghost', 'sincronizar'),
            UiKit.navButton('ejecucion.checklist', 'Volver al checklist', 'ghost'),
            UiKit.navButton('hallazgo.lista', 'Registrar hallazgo', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('EVIDENCIA_VACIA', 'evidencia.archivos', 'Adjunte al menos un archivo como evidencia.'));
  }

  @ActionDecorator.of({ id: 'capturar', permission: 'evidencia.capturar' })
  public capturar(): ActionBuilder {
    return ActionKit.captureMedia();
  }

  @ActionDecorator.of({ id: 'guardar_evidencia', permission: 'evidencia.capturar' })
  public guardarEvidencia(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/respuestas/{data.evidencia.respuesta_id}/evidencias', 'EVIDENCIA_VACIA').optimistic();
  }

  @ActionDecorator.of({ id: 'marcar_verificada', permission: 'evidencia.capturar' })
  public marcarVerificada(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/respuestas/{data.evidencia.respuesta_id}/verificacion', 'EVIDENCIA_VACIA');
  }
}

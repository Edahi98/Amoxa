import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({
  screenId: 'solicitud.lista',
  title: 'Solicitudes de contraseña',
  subtitle: 'Aprobar o rechazar restablecimientos',
})
export class SolicitudListaScreen extends ScreenDefinition {
  private solicitudes: OptionSpec[] = [];

  public prepare(context: ScreenContextBuilder): void {
    const opciones = context.build().data?.['opciones'] as { solicitudes?: OptionSpec[] } | undefined;
    this.solicitudes = opciones?.solicitudes ?? [];
  }

  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'inicio', 'perfil.editar');
    builder.action('refrescar', ActionKit.refresh());
    const elegida = ConditionBuilder.field('seleccion.solicitud_id', 'not_empty');
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'pendientes',
          'Solicitudes pendientes',
          UiKit.boundText('resumen', 'resumen', '', 'caption', 'muted'),
          UiKit.select('solicitud', 'Solicitud', 'seleccion.solicitud_id', this.solicitudes, {
            placeholder: 'Elija una solicitud',
          }),
          UiKit.row(
            'decision',
            UiKit.button('btn_aprobar', 'Aprobar y generar enlace', 'primary', 'aprobar_solicitud').enabledIf(elegida),
            UiKit.button('btn_rechazar', 'Rechazar', 'danger', 'rechazar_solicitud').enabledIf(elegida),
          ),
        ),
        UiKit.section(
          'enlace_seccion',
          'Enlace para la persona',
          UiKit.banner(
            'aviso_enlace',
            'warning',
            'Este enlace se muestra una sola vez y no puede consultarse de nuevo. Entréguelo a la persona; usted no verá ni define su contraseña. Si se pierde, rechace la solicitud y pida que la haga otra vez.',
          ),
          UiKit.boundText('enlace', 'url', '', 'body'),
          UiKit.boundText('vence', 'expiresAt', '', 'caption', 'muted'),
        ).visibleIf(ConditionBuilder.field('url', 'not_empty')),
        UiKit.row(
          'acciones',
          UiKit.button('btn_refrescar', 'Actualizar lista', 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'aprobar_solicitud', permission: 'solicitud_clave.aprobar' })
  public aprobarSolicitud(): ActionBuilder {
    return ActionKit.callApi('POST', '/password-requests/{data.seleccion.solicitud_id}/approve').payload({});
  }

  @ActionDecorator.of({ id: 'rechazar_solicitud', permission: 'solicitud_clave.rechazar' })
  public rechazarSolicitud(): ActionBuilder {
    return ActionKit.callApi('POST', '/password-requests/{data.seleccion.solicitud_id}/reject')
      .payload({})
      .confirmText('La persona tendrá que solicitar el restablecimiento de nuevo. ¿Rechazar la solicitud?');
  }
}

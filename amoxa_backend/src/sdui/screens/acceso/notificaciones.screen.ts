import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'notificaciones', title: 'Notificaciones', subtitle: 'Avisos del sistema para su rol' })
export class NotificacionesScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'bandeja',
          'Bandeja',
          UiKit.list('notificaciones', 'No tiene notificaciones pendientes.').bind('notificaciones'),
        ),
        UiKit.row(
          'acciones',
          UiKit.button('btn_marcar_leidas', 'Marcar todas como leídas', 'primary', 'marcar_leidas'),
          UiKit.button('btn_refrescar', 'Actualizar', 'outline', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'marcar_leidas', permission: 'notificacion.leer' })
  public marcarLeidas(): ActionBuilder {
    return ActionKit.submit('POST', '/notificaciones/leidas');
  }
}

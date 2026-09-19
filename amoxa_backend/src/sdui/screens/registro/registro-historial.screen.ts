import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'registro.historial', title: 'Historial de versiones', subtitle: 'Cada cambio conserva su autor, fecha y huella' })
export class RegistroHistorialScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'registro.buscar', 'inicio');
    builder.root(
      UiKit.page(
        'root',
        UiKit.banner('aviso', 'info', 'Cada cambio crea una versión nueva con su autor y fecha. Nada se borra.'),
        UiKit.section(
          'registro',
          'Registro',
          UiKit.boundText('titulo', 'registro.titulo', '', 'heading'),
          UiKit.list('versiones', 'Este registro todavía no tiene versiones.').bind('historial.versiones'),
        ),
        UiKit.row(
          'acciones',
          UiKit.button('btn_exportar', 'Exportar historial', 'primary', 'exportar_historial'),
          UiKit.navButton('registro.buscar', 'Volver a la búsqueda', 'outline'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'exportar_historial', permission: 'registro.exportar' })
  public exportarHistorial(): ActionBuilder {
    return ActionKit.callApi('GET', '/registros/{entity.id}/historial/exportar');
  }
}

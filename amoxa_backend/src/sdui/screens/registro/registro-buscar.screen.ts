import type { RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'registro.buscar', title: 'Buscar registros', subtitle: 'Consulta de información documentada' })
export class RegistroBuscarScreen extends ScreenDefinition {
  private static readonly ALCANCE: Partial<Record<RoleKey, string>> = {
    direccion: 'Puede consultar todos los registros del sistema.',
    gestor: 'Puede consultar todos los registros del sistema.',
    lider: 'Solo ve los registros de sus auditorías.',
    dueno_proceso: 'Solo ve los registros de su proceso.',
  };

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'registro.historial', 'inicio');
    builder.action('buscar', ActionKit.callApi('GET', '/registros?texto={data.busqueda.texto}&tipo={data.busqueda.tipo}'));
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'busqueda',
          'Búsqueda',
          UiKit.text('alcance', RegistroBuscarScreen.ALCANCE[role] ?? '', 'caption', 'muted'),
          UiKit.textInput('texto', 'Texto a buscar', 'busqueda.texto').on('submit', 'buscar'),
          UiKit.select('tipo', 'Tipo de registro', 'busqueda.tipo', [
            UiKit.option('programa', 'Programa de auditoría'),
            UiKit.option('auditoria', 'Auditoría'),
            UiKit.option('informe', 'Informe'),
            UiKit.option('hallazgo', 'Hallazgo'),
            UiKit.option('accion', 'Acción'),
          ]),
        ),
        UiKit.section('resultados', 'Resultados', UiKit.list('registros', 'No hay registros que coincidan con la búsqueda.').bind('registros')),
        UiKit.row(
          'acciones',
          UiKit.button('btn_buscar', 'Buscar', 'primary', 'buscar'),
          UiKit.navButton('registro.historial', 'Ver historial de versiones', 'outline'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}

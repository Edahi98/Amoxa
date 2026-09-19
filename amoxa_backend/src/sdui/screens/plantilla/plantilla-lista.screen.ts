import type { RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'plantilla.lista', title: 'Plantillas de checklist', subtitle: 'Versiones borrador y publicadas' })
export class PlantillaListaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    const esLider = role === 'lider';
    ActionKit.registerNavigation(builder, 'plantilla.editar', 'plantilla.publicar', 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.action('abrir_plantilla', ActionKit.navigate('plantilla.editar', { entityId: '{params.itemId}' }));
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'resumen',
          'Plantillas',
          UiKit.text(
            'descripcion',
            esLider
              ? 'Plantillas vigentes. Puede proponer preguntas desde el editor; el gestor las revisa.'
              : 'Plantillas en borrador y publicadas, con su versión y cobertura.',
          ),
          UiKit.list('plantillas', 'Todavía no hay plantillas registradas.').bind('plantillas').on('press', 'abrir_plantilla'),
        ),
        UiKit.row(
          'acciones',
          UiKit.navButton('plantilla.editar', esLider ? 'Proponer preguntas' : 'Crear o editar plantilla', 'primary'),
          UiKit.navButton('plantilla.publicar', 'Publicar versión', 'outline'),
          UiKit.button('btn_refrescar', 'Actualizar', 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}

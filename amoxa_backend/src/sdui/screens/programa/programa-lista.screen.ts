import type { RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'programa.lista', title: 'Programas de auditoría', subtitle: 'Estado y calendario del programa' })
export class ProgramaListaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    const esDireccion = role === 'direccion';
    ActionKit.registerNavigation(builder, 'programa.editar', 'programa.aprobar', 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.action(
      'abrir_programa',
      ActionKit.navigate(esDireccion ? 'programa.aprobar' : 'programa.editar', { entityId: '{params.itemId}' }),
    );
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'resumen',
          'Programas',
          UiKit.text(
            'descripcion',
            esDireccion
              ? 'Programas pendientes de su aprobación y programas vigentes.'
              : 'Programas del periodo con su estado y el calendario de auditorías.',
          ),
          UiKit.list('programas', 'Todavía no hay programas registrados.').bind('programas').on('press', 'abrir_programa'),
        ),
        UiKit.section('calendario_seccion', 'Calendario', UiKit.programCalendar('calendario', 'programa.calendario')),
        UiKit.row(
          'acciones',
          UiKit.navButton('programa.editar', 'Crear o editar programa', 'primary'),
          UiKit.navButton('programa.aprobar', 'Revisar programa pendiente', 'primary'),
          UiKit.button('btn_documento', 'Descargar programa (.docx)', 'outline', 'descargar_documento').visibleIf(
            ConditionBuilder.field('programa.id', 'not_empty'),
          ),
          UiKit.button('btn_refrescar', 'Actualizar', 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'descargar_documento', permission: 'programa.consultar' })
  public descargarDocumento(): ActionBuilder {
    return ActionKit.callApi('GET', '/programas/{data.programa.id}/documento');
  }
}

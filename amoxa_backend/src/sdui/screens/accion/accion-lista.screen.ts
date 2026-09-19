import type { RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'accion.lista', title: 'Acciones', subtitle: 'Acciones correctivas según su rol' })
export class AccionListaScreen extends ScreenDefinition {
  private static readonly DESCRIPCION: Partial<Record<RoleKey, string>> = {
    dueno_proceso: 'Sus acciones correctivas, con los días que faltan para su fecha límite.',
    gestor: 'Todas las acciones correctivas del programa y su estado.',
    auditor: 'Acciones reportadas que esperan su verificación de eficacia. No incluye las suyas.',
  };

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'accion.crear', 'accion.cierre', 'accion.verificar', 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'resumen',
          'Acciones',
          UiKit.text('descripcion', AccionListaScreen.DESCRIPCION[role] ?? ''),
          UiKit.list('acciones', 'No hay acciones para mostrar.').bind('acciones'),
        ),
        UiKit.row(
          'acciones_botones',
          UiKit.navButton('accion.crear', 'Crear acción correctiva', 'primary'),
          UiKit.navButton('accion.verificar', 'Verificar eficacia', 'primary'),
          UiKit.navButton('accion.cierre', 'Reportar cierre', 'outline'),
          UiKit.button('btn_refrescar', 'Actualizar', role === 'gestor' ? 'primary' : 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}

import type { RoleKey } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { InicioMenuGroups } from '@screens-acceso-inicio/inicio-menu-groups.js';

@ScreenDecorator.of({ screenId: 'shell.navegacion', title: 'Navegación', subtitle: 'Barra lateral de la aplicación' })
export class NavegacionScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    const destinos = RoleAccess.screensOf(role).filter((screenId) => screenId !== 'inicio' && screenId !== 'acceso.login');
    ActionKit.registerNavigation(builder, 'inicio', ...destinos);
    builder.root(
      UiKit.stack(
        'root',
        UiKit.navItem('inicio'),
        ...InicioMenuGroups.build(destinos).map((group) =>
          UiKit.stack(
            `grupo_${group.id}`,
            UiKit.text(`titulo_${group.id}`, group.title, 'caption', 'muted'),
            ...group.screens.map((screenId) => UiKit.navItem(screenId)),
          ),
        ),
      ),
    );
  }
}

import { SHARED_SCREENS, type RoleKey } from '@shared/roles.js';
import { NavGate } from '@shared-workflow/nav-gate.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { InicioMenuGroups, type InicioMenuGroup } from '@screens-acceso-inicio/inicio-menu-groups.js';

@ScreenDecorator.of({ screenId: 'shell.navegacion', title: 'Navegación', subtitle: 'Barra lateral de la aplicación' })
export class NavegacionScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    const shared = SHARED_SCREENS.filter((screenId) => screenId !== 'shell.navegacion');
    const destinos = [...RoleAccess.screensOf(role), ...shared].filter((screenId) => screenId !== 'inicio' && screenId !== 'acceso.login');
    ActionKit.registerNavigation(builder, 'inicio', ...destinos);
    builder.action('actualizar_pantalla', ActionKit.refresh());
    const control =
      role === 'superusuario'
        ? [UiKit.toggle('bloqueo_menu', 'Bloquear pasos del flujo', 'menu.bloqueo', 'Apagado, ve todo el menú.').on('change', 'cambiar_bloqueo')]
        : [];
    builder.root(
      UiKit.stack(
        'root',
        ...control,
        UiKit.navItem('inicio'),
        ...InicioMenuGroups.build(destinos).map((group) => this.group(group)),
      ),
    );
  }

  @ActionDecorator.of({ id: 'cambiar_bloqueo', permission: 'menu.bloquear' })
  public cambiarBloqueo(): ActionBuilder {
    return ActionKit.callApi('PUT', '/flujos/menu/bloqueo').onSuccess('actualizar_pantalla');
  }

  private group(group: InicioMenuGroup): ComponentBuilder {
    const gated = group.screens.filter((screenId) => NavGate.isGated(screenId));
    const free = group.screens.filter((screenId) => !NavGate.isGated(screenId));
    if (gated.length === 0) {
      return UiKit.stack(`grupo_${group.id}`, UiKit.text(`titulo_${group.id}`, group.title, 'caption', 'muted'), ...free.map((id) => UiKit.navItem(id)));
    }
    const first = gated[0];
    const count = gated.length === 1 ? '1 pantalla' : `${gated.length} pantallas`;
    const locked = UiKit.navLocked(group.id, free.length === 0 ? group.title : `Más de ${group.title}`, `${count} · se desbloquea al avanzar`).visibleIf(
      this.state(first, 'bloqueada'),
    );
    const title = UiKit.text(`titulo_${group.id}`, group.title, 'caption', 'muted');
    const open = gated.map((id) => UiKit.navItem(id).visibleIf(this.state(first, 'abierta')));
    const stack = UiKit.stack(`grupo_${group.id}`, free.length === 0 ? title.visibleIf(this.state(first, 'abierta')) : title, ...open, ...free.map((id) => UiKit.navItem(id)), locked);
    return free.length === 0 ? stack.visibleIf(ConditionBuilder.not(this.state(first, 'oculta'))) : stack;
  }

  private state(screenId: string, state: string) {
    return ConditionBuilder.field(`nav.${NavGate.key(screenId)}`, 'eq', state);
  }
}

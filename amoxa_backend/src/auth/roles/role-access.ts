import { ROLES, SHARED_SCREENS, type RoleKey } from '@shared/roles.js';
import { ScreenAccessError } from '@auth-roles/screen-access-error.js';

export class RoleAccess {
  public static readonly SHARED_SCREENS: readonly string[] = SHARED_SCREENS;

  public static canSee(role: RoleKey, screenId: string): boolean {
    return RoleAccess.SHARED_SCREENS.includes(screenId) || RoleAccess.screensOf(role).includes(screenId);
  }

  public static actsAs(role: RoleKey, target: RoleKey): boolean {
    return role === target || role === 'superusuario';
  }

  public static can(role: RoleKey, permission: string): boolean {
    return RoleAccess.permissionsOf(role).includes(permission);
  }

  public static assertCanSee(role: RoleKey, screenId: string): void {
    if (!RoleAccess.canSee(role, screenId)) {
      throw new ScreenAccessError(role, screenId);
    }
  }

  public static screensOf(role: RoleKey): readonly string[] {
    return ROLES[role].screens;
  }

  public static permissionsOf(role: RoleKey): readonly string[] {
    return ROLES[role].actions;
  }
}

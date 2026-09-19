import { ROLES, type AssignableRole, type RoleKey, type SessionRole } from '@shared/roles.js';

export class RoleCatalog {
  private static readonly NOT_ASSIGNABLE: readonly RoleKey[] = ['sistema', 'superusuario'];
  private static readonly NOT_SESSION: readonly RoleKey[] = ['sistema'];

  public static assignable(): readonly AssignableRole[] {
    return RoleCatalog.keysWithout(RoleCatalog.NOT_ASSIGNABLE) as AssignableRole[];
  }

  public static sessionRoles(): readonly SessionRole[] {
    return RoleCatalog.keysWithout(RoleCatalog.NOT_SESSION) as SessionRole[];
  }

  public static isAssignable(role: string): role is AssignableRole {
    return (RoleCatalog.assignable() as readonly string[]).includes(role);
  }

  private static keysWithout(excluded: readonly RoleKey[]): RoleKey[] {
    return (Object.keys(ROLES) as RoleKey[]).filter((key) => !excluded.includes(key));
  }
}

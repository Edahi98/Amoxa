import type { RoleKey, SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { RawUser } from '@sdui-builder/raw-json.types.js';

export type DbRole = TokenPayload['rol'];

export class RoleMapper {
  private static readonly ROLE_BY_DB_ROLE: Record<DbRole, SessionRole> = {
    admin: 'direccion',
    gestor_programa: 'gestor',
    lider_auditor: 'lider',
    auditor: 'auditor',
    auditado: 'dueno_proceso',
    superusuario: 'superusuario',
    administrador: 'administrador',
  };

  private static readonly DB_ROLES_BY_ROLE: Record<RoleKey, readonly DbRole[]> = {
    direccion: ['admin'],
    gestor: ['gestor_programa'],
    lider: ['lider_auditor'],
    auditor: ['auditor'],
    dueno_proceso: ['auditado'],
    superusuario: ['superusuario'],
    administrador: ['administrador'],
    sistema: [],
  };

  public static toSessionRole(dbRole: DbRole): SessionRole {
    return RoleMapper.ROLE_BY_DB_ROLE[dbRole];
  }

  public static dbRolesFor(role: RoleKey): readonly DbRole[] {
    return RoleMapper.DB_ROLES_BY_ROLE[role];
  }

  public static toDbRole(role: SessionRole): DbRole {
    return RoleMapper.DB_ROLES_BY_ROLE[role][0];
  }

  public static find(dbRole: string): SessionRole | undefined {
    return Object.hasOwn(RoleMapper.ROLE_BY_DB_ROLE, dbRole)
      ? RoleMapper.ROLE_BY_DB_ROLE[dbRole as DbRole]
      : undefined;
  }

  public static toRawUser(payload: TokenPayload): RawUser {
    return { id: payload.sub, nombre: payload.email, rol: RoleMapper.toSessionRole(payload.rol) };
  }
}

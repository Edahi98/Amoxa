import { ROLES } from '@shared/roles.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import { AssignableRoleSchema } from '@validators-usuarios/assignable-role.schema.js';

describe('RoleCatalog', () => {
  it('los roles asignables son los existentes más administrador, sin sistema ni superusuario', () => {
    expect(RoleCatalog.assignable()).toEqual(['direccion', 'gestor', 'lider', 'auditor', 'dueno_proceso', 'administrador']);
  });

  it('todo rol asignable sale de la definición de roles', () => {
    for (const role of RoleCatalog.assignable()) {
      expect(Object.keys(ROLES)).toContain(role);
    }
  });

  it('los roles de sesión incluyen al superusuario y excluyen al sistema', () => {
    expect(RoleCatalog.sessionRoles()).toContain('superusuario');
    expect(RoleCatalog.sessionRoles()).not.toContain('sistema');
  });

  it('el esquema de rol asignable rechaza superusuario, sistema y desconocidos', () => {
    expect(AssignableRoleSchema.safeParse('administrador').success).toBe(true);
    expect(AssignableRoleSchema.safeParse('superusuario').success).toBe(false);
    expect(AssignableRoleSchema.safeParse('sistema').success).toBe(false);
    expect(AssignableRoleSchema.safeParse('root').success).toBe(false);
  });

  it('cada rol asignable tiene un rol de base de datos', () => {
    for (const role of RoleCatalog.assignable()) {
      expect(RoleMapper.toDbRole(role)).toBeDefined();
    }
  });

  it('los roles existentes conservan su código y traducción', () => {
    expect(ROLES.direccion.code).toBe('AD');
    expect(RoleMapper.toDbRole('direccion')).toBe('admin');
    expect(RoleMapper.toSessionRole('superusuario')).toBe('superusuario');
    expect(RoleMapper.toSessionRole('administrador')).toBe('administrador');
  });
});

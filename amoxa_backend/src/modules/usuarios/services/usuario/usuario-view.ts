import type { InferSelectModel } from 'drizzle-orm';
import type { SessionRole } from '@shared/roles.js';
import type { usuario } from '@schemas/index.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';

export type UsuarioRow = InferSelectModel<typeof usuario>;

export interface UsuarioView {
  id: string;
  organizacionId: string;
  nombre: string;
  email: string;
  rol: SessionRole;
  activo: boolean;
  passwordDefinida: boolean;
  ultimoAccesoEn: Date | null;
}

export class UsuarioViewMapper {
  public static from(row: UsuarioRow): UsuarioView {
    return {
      id: row.id,
      organizacionId: row.organizacionId,
      nombre: row.nombre,
      email: row.email,
      rol: RoleMapper.toSessionRole(row.rol),
      activo: row.activo,
      passwordDefinida: row.passwordHash !== null,
      ultimoAccesoEn: row.ultimoAccesoEn,
    };
  }
}

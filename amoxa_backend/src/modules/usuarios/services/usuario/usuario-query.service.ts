import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { usuario } from '@schemas/index.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import type { UsuarioListQuery } from '@validators-usuarios/usuario-list-query.schema.js';
import { UsuarioViewMapper, type UsuarioRow, type UsuarioView } from '@usuarios-services-usuario/usuario-view.js';

export interface UsuarioPage {
  items: UsuarioView[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class UsuarioQueryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async list(query: UsuarioListQuery): Promise<UsuarioPage> {
    const where = this.conditions(query);
    const [{ total }] = await this.db.select({ total: count() }).from(usuario).where(where);
    const rows = await this.db
      .select()
      .from(usuario)
      .where(where)
      .orderBy(asc(usuario.nombre), asc(usuario.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return { items: rows.map((row) => UsuarioViewMapper.from(row)), page: query.page, limit: query.limit, total };
  }

  public async get(id: string): Promise<UsuarioView> {
    return UsuarioViewMapper.from(await this.findOrFail(id));
  }

  public async findOrFail(id: string, executor: DbExecutor = this.db): Promise<UsuarioRow> {
    const [row] = await executor.select().from(usuario).where(eq(usuario.id, id)).limit(1);
    if (!row) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return row;
  }

  private conditions(query: UsuarioListQuery): SQL | undefined {
    const conditions: SQL[] = [];
    if (query.rol !== undefined) {
      conditions.push(inArray(usuario.rol, [...RoleMapper.dbRolesFor(query.rol)]));
    }
    if (query.activo !== undefined) {
      conditions.push(eq(usuario.activo, query.activo));
    }
    if (query.search !== undefined) {
      const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(or(ilike(usuario.nombre, pattern), ilike(usuario.email, pattern))!);
    }
    return conditions.length === 0 ? undefined : and(...conditions);
  }
}

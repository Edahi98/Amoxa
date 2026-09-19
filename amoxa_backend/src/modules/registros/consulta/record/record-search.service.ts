import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { informacionDocumentada, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { RecordEntry, RecordPage } from '@registros-consulta-record/record-entry.types.js';
import { RecordPresenter } from '@registros-consulta-record/record-presenter.js';
import { RecordScope } from '@registros-consulta-record/record-scope.js';
import type { RecordSearchInput } from '@validators-registros/record-search.schema.js';

@Injectable()
export class RecordSearchService {
  private static readonly DEFAULT_PAGE_SIZE = 20;

  constructor(@Inject(DB) private readonly db: Db) {}

  public async search(user: TokenPayload, role: SessionRole, input: RecordSearchInput): Promise<RecordPage> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? RecordSearchService.DEFAULT_PAGE_SIZE;
    const conditions: SQL[] = [RecordScope.condition(this.db, user, role)];
    if (input.tipo !== undefined) {
      conditions.push(eq(informacionDocumentada.entidadTipo, input.tipo));
    }
    if (input.texto !== undefined) {
      conditions.push(RecordSearchService.textCondition(input.texto));
    }

    const latest = this.db
      .selectDistinctOn([informacionDocumentada.entidadTipo, informacionDocumentada.entidadId], {
        id: informacionDocumentada.id,
        entidadTipo: informacionDocumentada.entidadTipo,
        entidadId: informacionDocumentada.entidadId,
        version: informacionDocumentada.version,
        hash: informacionDocumentada.hash,
        fecha: informacionDocumentada.fecha,
        confidencialidad: informacionDocumentada.confidencialidad,
        autorId: sql<string>`${usuario.id}`.as('autor_id'),
        autor: sql<string>`${usuario.nombre}`.as('autor'),
      })
      .from(informacionDocumentada)
      .innerJoin(usuario, eq(informacionDocumentada.creadoPorId, usuario.id))
      .where(and(...conditions))
      .orderBy(informacionDocumentada.entidadTipo, informacionDocumentada.entidadId, desc(informacionDocumentada.version))
      .as('ultimas_versiones');

    const [totalRow] = await this.db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(latest);
    const rows: RecordEntry[] = await this.db
      .select()
      .from(latest)
      .orderBy(desc(latest.fecha), desc(latest.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { registros: rows.map((row) => RecordPresenter.item(row)), total: totalRow?.total ?? 0, page, pageSize };
  }

  private static textCondition(texto: string): SQL {
    const pattern = `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
    return or(
      ilike(informacionDocumentada.entidadTipo, pattern),
      ilike(usuario.nombre, pattern),
      ilike(informacionDocumentada.hash, pattern),
      sql`${informacionDocumentada.entidadId}::text ilike ${pattern}`,
    ) as SQL;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { informacionDocumentada, organizacion, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { RecordHistoryDocumentData } from '@docx-registros/record-history.docx.js';
import type { RecordEntry, RecordHistory } from '@registros-consulta-record/record-entry.types.js';
import { RecordPresenter } from '@registros-consulta-record/record-presenter.js';
import { RecordScope } from '@registros-consulta-record/record-scope.js';

@Injectable()
export class RecordHistoryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async entries(user: TokenPayload, role: SessionRole, entidadId: string): Promise<RecordEntry[]> {
    const rows = await this.db
      .select({
        id: informacionDocumentada.id,
        entidadTipo: informacionDocumentada.entidadTipo,
        entidadId: informacionDocumentada.entidadId,
        version: informacionDocumentada.version,
        hash: informacionDocumentada.hash,
        fecha: informacionDocumentada.fecha,
        confidencialidad: informacionDocumentada.confidencialidad,
        autorId: usuario.id,
        autor: usuario.nombre,
      })
      .from(informacionDocumentada)
      .innerJoin(usuario, eq(informacionDocumentada.creadoPorId, usuario.id))
      .where(and(eq(informacionDocumentada.entidadId, entidadId), RecordScope.condition(this.db, user, role)))
      .orderBy(desc(informacionDocumentada.version));
    if (rows.length === 0) {
      throw new NotFoundException('Registro no encontrado');
    }
    return rows;
  }

  public async history(user: TokenPayload, role: SessionRole, entidadId: string): Promise<RecordHistory> {
    return RecordPresenter.history(await this.entries(user, role, entidadId));
  }

  public async documentData(user: TokenPayload, role: SessionRole, entidadId: string): Promise<RecordHistoryDocumentData> {
    const entries = await this.entries(user, role, entidadId);
    const [org] = await this.db.select({ nombre: organizacion.nombre }).from(organizacion).where(eq(organizacion.id, user.organizacionId));
    return {
      organizacion: org?.nombre ?? 'Organización',
      generadoEn: new Date(),
      entidadTipo: RecordPresenter.typeLabel(entries[0].entidadTipo),
      entidadId,
      versiones: entries.map((entry) => ({
        version: entry.version,
        autor: entry.autor,
        fecha: entry.fecha,
        hash: entry.hash,
        confidencialidad: entry.confidencialidad,
      })),
    };
  }
}

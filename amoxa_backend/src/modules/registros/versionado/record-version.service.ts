import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { informacionDocumentada } from '@schemas/index.js';
import { ContentHasher } from '@registros-versionado/content-hasher.js';

export type Confidencialidad = 'publico' | 'interno' | 'confidencial' | 'restringido';

export interface RecordVersionInput {
  entidadTipo: string;
  entidadId: string;
  creadoPorId: string;
  contenido: unknown;
  retencionHasta?: string;
  confidencialidad?: Confidencialidad;
}

export interface RecordVersionResult {
  id: string;
  version: number;
  hash: string;
}

@Injectable()
export class RecordVersionService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async record(input: RecordVersionInput, executor: DbExecutor = this.db): Promise<RecordVersionResult> {
    const [last] = await executor
      .select({ version: informacionDocumentada.version })
      .from(informacionDocumentada)
      .where(
        and(
          eq(informacionDocumentada.entidadTipo, input.entidadTipo),
          eq(informacionDocumentada.entidadId, input.entidadId),
        ),
      )
      .orderBy(desc(informacionDocumentada.version))
      .limit(1);

    const version = (last?.version ?? 0) + 1;
    const hash = ContentHasher.sha256(input.contenido);
    const [created] = await executor
      .insert(informacionDocumentada)
      .values({
        entidadTipo: input.entidadTipo,
        entidadId: input.entidadId,
        version,
        hash,
        creadoPorId: input.creadoPorId,
        retencionHasta: input.retencionHasta,
        confidencialidad: input.confidencialidad ?? 'interno',
      })
      .returning({ id: informacionDocumentada.id });

    return { id: created.id, version, hash };
  }

  async history(entidadTipo: string, entidadId: string, executor: DbExecutor = this.db) {
    return executor
      .select()
      .from(informacionDocumentada)
      .where(and(eq(informacionDocumentada.entidadTipo, entidadTipo), eq(informacionDocumentada.entidadId, entidadId)))
      .orderBy(desc(informacionDocumentada.version));
  }
}

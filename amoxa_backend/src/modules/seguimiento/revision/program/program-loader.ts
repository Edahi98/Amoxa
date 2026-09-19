import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { programaAuditoria } from '@schemas/index.js';
import type { ProgramSummary } from '@seguimiento-revision/revision.types.js';

@Injectable()
export class ProgramLoader {
  private static readonly REVIEWABLE: readonly ProgramSummary['estado'][] = ['aprobado', 'en_ejecucion', 'cerrado'];
  private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(@Inject(DB) private readonly db: Db) {}

  public async find(organizacionId: string, programaId: string, executor: DbExecutor = this.db): Promise<ProgramSummary> {
    const [row] = await executor
      .select({
        id: programaAuditoria.id,
        periodo: programaAuditoria.periodo,
        estado: programaAuditoria.estado,
        version: programaAuditoria.version,
        objetivos: programaAuditoria.objetivos,
      })
      .from(programaAuditoria)
      .where(and(eq(programaAuditoria.id, programaId), eq(programaAuditoria.organizacionId, organizacionId)));
    if (row === undefined) {
      throw new NotFoundException('Programa no encontrado');
    }
    return row;
  }

  public async resolve(organizacionId: string, entityId?: string): Promise<ProgramSummary | undefined> {
    if (entityId !== undefined && ProgramLoader.UUID_PATTERN.test(entityId)) {
      return this.find(organizacionId, entityId);
    }
    return this.latest(organizacionId);
  }

  public async latest(organizacionId: string, executor: DbExecutor = this.db): Promise<ProgramSummary | undefined> {
    const [row] = await executor
      .select({
        id: programaAuditoria.id,
        periodo: programaAuditoria.periodo,
        estado: programaAuditoria.estado,
        version: programaAuditoria.version,
        objetivos: programaAuditoria.objetivos,
      })
      .from(programaAuditoria)
      .where(eq(programaAuditoria.organizacionId, organizacionId))
      .orderBy(desc(programaAuditoria.periodo))
      .limit(1);
    return row;
  }

  public assertReviewable(program: ProgramSummary): void {
    if (!ProgramLoader.REVIEWABLE.includes(program.estado)) {
      throw new UnprocessableEntityException(
        'El programa todavía no está aprobado: la revisión solo aplica a programas aprobados, en ejecución o cerrados.',
      );
    }
  }
}

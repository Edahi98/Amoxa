import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { leccionAprendida, programaAuditoria } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { ProgramLoader } from '@seguimiento-revision-program/program-loader.js';
import type { NextProgramResult, RevisionWriteResult } from '@seguimiento-revision/revision.types.js';
import type { LessonInput } from '@validators-seguimiento/lesson.schema.js';
import type { NextPeriodInput } from '@validators-seguimiento/next-period.schema.js';

@Injectable()
export class ProgramReviewService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly programs: ProgramLoader,
    private readonly versions: RecordVersionService,
  ) {}

  public async registerLessons(user: TokenPayload, programaId: string, input: LessonInput): Promise<RevisionWriteResult> {
    const programa = await this.programs.find(user.organizacionId, programaId);
    this.programs.assertReviewable(programa);

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(leccionAprendida)
        .values({ programaId, texto: input.lecciones, creadoPorId: user.sub })
        .returning({ id: leccionAprendida.id });
      const version = await this.versions.record(
        {
          entidadTipo: 'leccion_aprendida',
          entidadId: programaId,
          creadoPorId: user.sub,
          contenido: { programaId, periodo: programa.periodo, lecciones: input.lecciones },
        },
        tx,
      );
      return { id: created.id, version: version.version };
    });
  }

  public async createNext(user: TokenPayload, programaId: string, input: NextPeriodInput): Promise<NextProgramResult> {
    const origen = await this.programs.find(user.organizacionId, programaId);
    this.programs.assertReviewable(origen);
    if (input.periodo === origen.periodo) {
      throw new UnprocessableEntityException('El periodo siguiente debe ser distinto al periodo del programa actual.');
    }

    return this.db.transaction(async (tx) => {
      const [duplicated] = await tx
        .select({ id: programaAuditoria.id })
        .from(programaAuditoria)
        .where(and(eq(programaAuditoria.organizacionId, user.organizacionId), eq(programaAuditoria.periodo, input.periodo)))
        .limit(1);
      if (duplicated !== undefined) {
        throw new ConflictException('Ya existe un programa de auditoría para ese periodo.');
      }

      const [source] = await tx.select().from(programaAuditoria).where(eq(programaAuditoria.id, programaId));
      const [created] = await tx
        .insert(programaAuditoria)
        .values({
          organizacionId: user.organizacionId,
          periodo: input.periodo,
          creadoPorId: user.sub,
          objetivos: source.objetivos,
          riesgosOportunidades: source.riesgosOportunidades,
          frecuencia: source.frecuencia,
          metodos: source.metodos,
          estado: 'borrador',
          version: 1,
        })
        .returning();
      await this.versions.record(
        {
          entidadTipo: 'programa',
          entidadId: created.id,
          creadoPorId: user.sub,
          contenido: { ...created, origenId: programaId },
        },
        tx,
      );
      return { id: created.id, periodo: created.periodo, estado: 'borrador', version: created.version, origenId: programaId };
    });
  }
}

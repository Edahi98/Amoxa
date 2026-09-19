import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { leccionAprendida, revisionDireccion, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';
import { ProgramLoader } from '@seguimiento-revision-program/program-loader.js';
import { ReviewSummaryBuilder } from '@seguimiento-revision-review/review-summary-builder.js';
import type {
  LessonEntry,
  ProgramSummary,
  ReviewEvent,
  RevisionView,
  RevisionWriteResult,
} from '@seguimiento-revision/revision.types.js';
import type { ReviewDecisionInput } from '@validators-seguimiento/review-decision.schema.js';

@Injectable()
export class RevisionDireccionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly programs: ProgramLoader,
    private readonly indicators: IndicatorsService,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async view(user: TokenPayload, programaId: string): Promise<RevisionView> {
    const programa = await this.programs.find(user.organizacionId, programaId);
    return this.build(user.organizacionId, programa);
  }

  public async build(organizacionId: string, programa: ProgramSummary): Promise<RevisionView> {
    const indicadores = await this.indicators.compute({ organizacionId, programaId: programa.id });
    const [presentaciones, decisiones, lecciones] = await Promise.all([
      this.events(programa.id, 'presentacion'),
      this.events(programa.id, 'decision'),
      this.lessons(programa.id),
    ]);
    return {
      programa,
      revision: {
        resumen: ReviewSummaryBuilder.build({ periodo: programa.periodo, estado: programa.estado, indicadores }),
        decisiones: '',
        recursos: '',
      },
      indicadores,
      presentaciones,
      decisiones,
      lecciones,
    };
  }

  public async present(user: TokenPayload, programaId: string): Promise<RevisionWriteResult> {
    const programa = await this.programs.find(user.organizacionId, programaId);
    this.programs.assertReviewable(programa);
    const indicadores = await this.indicators.compute({ organizacionId: user.organizacionId, programaId });
    const resumen = ReviewSummaryBuilder.build({ periodo: programa.periodo, estado: programa.estado, indicadores });

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(revisionDireccion)
        .values({ programaId, tipo: 'presentacion', resumen, indicadores, creadoPorId: user.sub })
        .returning({ id: revisionDireccion.id });
      const version = await this.versions.record(
        {
          entidadTipo: 'revision_direccion',
          entidadId: programaId,
          creadoPorId: user.sub,
          contenido: { tipo: 'presentacion', resumen, indicadores },
          confidencialidad: 'confidencial',
        },
        tx,
      );
      await this.notifications.notifyRole(
        user.organizacionId,
        'direccion',
        {
          tipo: 'revision_direccion_presentada',
          titulo: 'Resumen de revisión por la dirección',
          mensaje: `El gestor presentó el resumen de resultados del programa ${programa.periodo}.`,
          entidadTipo: 'programa',
          entidadId: programaId,
        },
        tx,
      );
      return { id: created.id, version: version.version };
    });
  }

  public async decide(user: TokenPayload, programaId: string, input: ReviewDecisionInput): Promise<RevisionWriteResult> {
    const programa = await this.programs.find(user.organizacionId, programaId);
    this.programs.assertReviewable(programa);

    return this.db.transaction(async (tx) => {
      const [presented] = await tx
        .select({ id: revisionDireccion.id })
        .from(revisionDireccion)
        .where(and(eq(revisionDireccion.programaId, programaId), eq(revisionDireccion.tipo, 'presentacion')))
        .limit(1);
      if (presented === undefined) {
        throw new UnprocessableEntityException(
          'La dirección solo puede decidir después de que el gestor presente el resumen de resultados.',
        );
      }
      const [created] = await tx
        .insert(revisionDireccion)
        .values({
          programaId,
          tipo: 'decision',
          decisiones: input.decisiones,
          recursos: input.recursos ?? null,
          creadoPorId: user.sub,
        })
        .returning({ id: revisionDireccion.id });
      const version = await this.versions.record(
        {
          entidadTipo: 'revision_direccion',
          entidadId: programaId,
          creadoPorId: user.sub,
          contenido: { tipo: 'decision', decisiones: input.decisiones, recursos: input.recursos ?? null },
          confidencialidad: 'confidencial',
        },
        tx,
      );
      await this.notifications.notifyRole(
        user.organizacionId,
        'gestor',
        {
          tipo: 'revision_direccion_decidida',
          titulo: 'Decisiones de la revisión por la dirección',
          mensaje: `La dirección registró sus decisiones y recursos para el programa ${programa.periodo}.`,
          entidadTipo: 'programa',
          entidadId: programaId,
        },
        tx,
      );
      return { id: created.id, version: version.version };
    });
  }

  private async events(programaId: string, tipo: 'presentacion' | 'decision'): Promise<ReviewEvent[]> {
    return this.db
      .select({
        id: revisionDireccion.id,
        creadaEn: revisionDireccion.creadaEn,
        autor: usuario.nombre,
        resumen: revisionDireccion.resumen,
        decisiones: revisionDireccion.decisiones,
        recursos: revisionDireccion.recursos,
      })
      .from(revisionDireccion)
      .innerJoin(usuario, eq(revisionDireccion.creadoPorId, usuario.id))
      .where(and(eq(revisionDireccion.programaId, programaId), eq(revisionDireccion.tipo, tipo)))
      .orderBy(asc(revisionDireccion.creadaEn));
  }

  private async lessons(programaId: string): Promise<LessonEntry[]> {
    return this.db
      .select({
        id: leccionAprendida.id,
        creadaEn: leccionAprendida.creadaEn,
        autor: usuario.nombre,
        texto: leccionAprendida.texto,
      })
      .from(leccionAprendida)
      .innerJoin(usuario, eq(leccionAprendida.creadoPorId, usuario.id))
      .where(eq(leccionAprendida.programaId, programaId))
      .orderBy(asc(leccionAprendida.creadaEn));
  }
}

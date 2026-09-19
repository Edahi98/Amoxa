import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { auditor, evaluacionAuditor, evaluacionCompetencia } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { AuditorFichaBody } from '@validators-auditores/auditor-ficha.schema.js';
import type { EvaluacionBody } from '@validators-auditores-evaluacion/evaluacion-body.schema.js';
import { AuditorAptitude } from '@auditores-rules-auditor/auditor-aptitude.js';
import { CompetenceCalculator } from '@auditores-rules/competence-calculator.js';
import { AuditorMapper } from '@auditores-mappers-auditor/auditor-mapper.js';
import type { AuditorRecord, AuditorView, EvaluacionView } from '@auditores-mappers-auditor/auditor-view.js';
import { AuditorQueryService } from '@auditores-services-auditor/auditor-query.service.js';

export interface EvaluacionResultado {
  evaluacion: EvaluacionView;
  auditor: AuditorView;
}

@Injectable()
export class AuditoresService {
  public static readonly ENTITY_TYPE = 'auditor';
  public static readonly EVALUATION_TYPE = 'evaluacion_auditor';

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: AuditorQueryService,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async updateFicha(id: string, user: TokenPayload, body: AuditorFichaBody): Promise<AuditorView> {
    return this.db.transaction(async (tx) => {
      const record = await this.query.find(id, user.organizacionId, tx);
      await this.ensureAuditor(tx, record);
      const values = {
        ...(body.formacion !== undefined && { formacion: body.formacion }),
        ...(body.experiencia !== undefined && { experiencia: body.experiencia }),
        ...(body.especialidades !== undefined && { disciplinas: body.especialidades }),
      };
      if (Object.keys(values).length > 0) {
        await tx.update(auditor).set(values).where(eq(auditor.usuarioId, id));
      }
      return this.finish(tx, user, id);
    });
  }

  public async registerEvaluation(id: string, user: TokenPayload, body: EvaluacionBody): Promise<EvaluacionResultado> {
    const metodos = CompetenceCalculator.distinctMethods(body.metodos);
    if (!CompetenceCalculator.hasEnoughMethods(metodos)) {
      throw new UnprocessableEntityException('Debe aplicar al menos dos métodos de evaluación.');
    }
    return this.db.transaction(async (tx) => {
      const record = await this.query.find(id, user.organizacionId, tx);
      await this.ensureAuditor(tx, record);
      const fecha = body.fecha ?? AuditorAptitude.today();
      const outcome = CompetenceCalculator.evaluate({
        metodos,
        resultado: body.resultado,
        fecha,
        estadoActual: record.estado,
      });

      const [evaluation] = await tx
        .insert(evaluacionAuditor)
        .values({
          auditorId: id,
          evaluadorId: user.sub,
          fecha,
          resultado: body.resultado,
          observaciones: body.observaciones ?? null,
          estadoResultante: outcome.estado,
          vigenciaHasta: outcome.vigenciaHasta,
        })
        .returning();
      await tx.insert(evaluacionCompetencia).values(
        metodos.map((metodo) => ({
          auditorId: id,
          evaluacionId: evaluation.id,
          metodo: metodo as (typeof evaluacionCompetencia.$inferInsert)['metodo'],
          resultado: body.resultado,
          fecha,
          evaluadorId: user.sub,
        })),
      );
      await tx
        .update(auditor)
        .set({ estado: outcome.estado, vigenciaHasta: outcome.vigenciaHasta })
        .where(eq(auditor.usuarioId, id));

      await this.versions.record(
        {
          entidadTipo: AuditoresService.EVALUATION_TYPE,
          entidadId: evaluation.id,
          creadoPorId: user.sub,
          contenido: { ...evaluation, creadaEn: evaluation.creadaEn.toISOString(), metodos },
        },
        tx,
      );
      const view = await this.finish(tx, user, id);
      await this.notifications.notifyUsers(
        [id],
        {
          tipo: 'auditor_evaluado',
          titulo: 'Evaluación de competencia registrada',
          mensaje: `Su evaluación quedó como: ${view.apto}.`,
          entidadTipo: AuditoresService.ENTITY_TYPE,
          entidadId: id,
        },
        tx,
      );
      const created = view.evaluaciones.find((entry) => entry.id === evaluation.id) as EvaluacionView;
      return { evaluacion: created, auditor: view };
    });
  }

  private async ensureAuditor(executor: DbExecutor, record: AuditorRecord): Promise<void> {
    if (record.estado === null) {
      await executor.insert(auditor).values({ usuarioId: record.id, estado: 'formacion' }).onConflictDoNothing();
    }
  }

  private async finish(executor: DbExecutor, user: TokenPayload, id: string): Promise<AuditorView> {
    const record = await this.query.find(id, user.organizacionId, executor);
    const evaluaciones = await this.query.evaluations(id, executor);
    await this.versions.record(
      {
        entidadTipo: AuditoresService.ENTITY_TYPE,
        entidadId: id,
        creadoPorId: user.sub,
        contenido: { ...record, evaluaciones: evaluaciones.map((entry) => entry.id) },
      },
      executor,
    );
    return AuditorMapper.toView(record, evaluaciones);
  }
}

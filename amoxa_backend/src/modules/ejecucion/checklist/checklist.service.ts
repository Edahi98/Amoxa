import { ConflictException, ForbiddenException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { asc, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { adjunto, auditor, pregunta, respuestaEvidencia } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { GuardarRespuestasInput } from '@validators-ejecucion/guardar-respuestas.schema.js';
import type { ArchivoDeclarado } from '@validators-ejecucion/subir-evidencia.schema.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import type { AuditoriaContext } from '@ejecucion-acceso-auditoria/auditoria-context.js';
import { EvidenceService } from '@ejecucion-evidencia/evidence.service.js';
import { EvidenceViewMapper } from '@ejecucion-evidencia/evidence-view.js';
import { AuditTransitions } from '@ejecucion-reglas/audit-transitions.js';
import { BusinessRule } from '@ejecucion-reglas/business-rule.js';
import { ChecklistMapper } from '@ejecucion-reglas-checklist/checklist-mapper.js';
import { ChecklistProgress } from '@ejecucion-reglas-checklist/checklist-progress.js';
import type {
  ChecklistQuestionView,
  ChecklistSaveMeta,
  ChecklistSaveResult,
  ChecklistView,
} from '@ejecucion-checklist/checklist-view.js';

type PreguntaRow = typeof pregunta.$inferSelect;
type RespuestaRow = typeof respuestaEvidencia.$inferSelect;

interface PlannedAnswer {
  pregunta: PreguntaRow;
  result: NonNullable<ReturnType<typeof ChecklistMapper.toDb>>;
  comment: string | null;
  evidencias: ArchivoDeclarado[];
}

@Injectable()
export class ChecklistService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccessService,
    private readonly versions: RecordVersionService,
    private readonly evidence: EvidenceService,
  ) {}

  public async view(auditoriaId: string, user: TokenPayload, executor: DbExecutor = this.db): Promise<ChecklistView> {
    const context = await this.access.loadAsMember(auditoriaId, user, executor);
    return this.build(context, executor);
  }

  public async build(context: AuditoriaContext, executor: DbExecutor = this.db): Promise<ChecklistView> {
    const preguntas = await this.questions(context, executor);
    const respuestas = await executor
      .select()
      .from(respuestaEvidencia)
      .where(eq(respuestaEvidencia.auditoriaId, context.auditoria.id));
    const adjuntos =
      respuestas.length === 0
        ? []
        : await executor
            .select()
            .from(adjunto)
            .where(
              inArray(
                adjunto.respuestaId,
                respuestas.map((item) => item.id),
              ),
            )
            .orderBy(asc(adjunto.capturadoEn));
    const byQuestion = new Map(respuestas.map((item) => [item.preguntaId, item]));

    const items: ChecklistQuestionView[] = preguntas.map((item) => {
      const answer = byQuestion.get(item.id);
      return {
        clave: ChecklistMapper.keyOf(item.orden),
        preguntaId: item.id,
        orden: item.orden,
        texto: item.texto,
        clausula: item.clausulaRef,
        criterio: ChecklistMapper.criterion(item.tipoCriterio),
        tipoRespuesta: item.tipoRespuesta,
        evidenciaObligatoria: item.evidenciaObligatoria,
        respuesta:
          answer === undefined
            ? null
            : {
                id: answer.id,
                result: ChecklistMapper.toClient(answer.resultado),
                comment: answer.comentario,
                verificada: answer.verificada,
                version: answer.version,
                auditorId: answer.auditorId,
                respondidaEn: answer.timestamp.toISOString(),
                evidencias: adjuntos
                  .filter((file) => file.respuestaId === answer.id)
                  .map((file) => EvidenceViewMapper.from(file, answer.verificada)),
              },
      };
    });

    return {
      auditoriaId: context.auditoria.id,
      estado: context.auditoria.estado,
      version: ChecklistProgress.version(respuestas.map((item) => item.version)),
      progreso: ChecklistProgress.compute(items.length, items.filter((item) => item.respuesta !== null).length),
      preguntas: items,
    };
  }

  public async save(
    auditoriaId: string,
    user: TokenPayload,
    input: GuardarRespuestasInput,
    meta: ChecklistSaveMeta = {},
  ): Promise<ChecklistSaveResult> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      await this.assertAuditor(user, tx);

      const preguntas = await this.questions(context, tx);
      const planned = this.plan(preguntas, input);
      const existing = await tx
        .select()
        .from(respuestaEvidencia)
        .where(eq(respuestaEvidencia.auditoriaId, auditoriaId));
      const byQuestion = new Map(existing.map((item) => [item.preguntaId, item]));
      const currentVersion = ChecklistProgress.version(existing.map((item) => item.version));

      if (
        meta.idempotencyKey !== undefined &&
        planned.length > 0 &&
        planned.every((item) => byQuestion.get(item.pregunta.id)?.claveIdempotencia === meta.idempotencyKey)
      ) {
        return this.result(0, planned.length, true, currentVersion, preguntas.length, existing.length);
      }
      if (meta.ifVersion !== undefined && meta.ifVersion !== currentVersion) {
        throw new ConflictException(
          'El checklist cambió en el servidor desde su última lectura. Actualice la pantalla antes de guardar.',
        );
      }

      let applied = 0;
      let unchanged = 0;
      let created = 0;
      for (const item of planned) {
        const previous = byQuestion.get(item.pregunta.id);
        if (previous !== undefined && previous.resultado === item.result && previous.comentario === item.comment) {
          unchanged += 1;
          if (item.evidencias.length > 0) {
            await this.evidence.declareWithin(tx, previous, item.evidencias, undefined, user);
          }
          continue;
        }
        const saved = await this.persist(tx, auditoriaId, user, item, previous, meta.idempotencyKey);
        if (item.evidencias.length > 0) {
          await this.evidence.declareWithin(tx, saved, item.evidencias, undefined, user);
        }
        if (previous === undefined) {
          created += 1;
        }
        applied += 1;
        await this.versions.record(
          {
            entidadTipo: 'respuesta_evidencia',
            entidadId: saved.id,
            creadoPorId: user.sub,
            contenido: {
              auditoriaId,
              preguntaId: saved.preguntaId,
              resultado: saved.resultado,
              comentario: saved.comentario,
              verificada: saved.verificada,
              version: saved.version,
            },
          },
          tx,
        );
      }

      const nextVersion = applied === 0 ? currentVersion : await this.currentVersion(tx, auditoriaId);
      return this.result(applied, unchanged, false, nextVersion, preguntas.length, existing.length + created);
    });
  }

  private async persist(
    tx: DbExecutor,
    auditoriaId: string,
    user: TokenPayload,
    item: PlannedAnswer,
    previous: RespuestaRow | undefined,
    key: string | undefined,
  ): Promise<RespuestaRow> {
    if (previous === undefined) {
      const [row] = await tx
        .insert(respuestaEvidencia)
        .values({
          auditoriaId,
          preguntaId: item.pregunta.id,
          auditorId: user.sub,
          resultado: item.result,
          comentario: item.comment,
          claveIdempotencia: key ?? null,
        })
        .returning();
      return row;
    }
    const [row] = await tx
      .update(respuestaEvidencia)
      .set({
        auditorId: user.sub,
        resultado: item.result,
        comentario: item.comment,
        timestamp: new Date(),
        version: previous.version + 1,
        claveIdempotencia: key ?? null,
      })
      .where(eq(respuestaEvidencia.id, previous.id))
      .returning();
    return row;
  }

  private plan(preguntas: readonly PreguntaRow[], input: GuardarRespuestasInput): PlannedAnswer[] {
    const byOrder = new Map(preguntas.map((item) => [item.orden, item]));
    const byId = new Map(preguntas.map((item) => [item.id, item]));
    const planned: PlannedAnswer[] = [];
    for (const [key, value] of Object.entries(input.respuestas)) {
      const order = ChecklistMapper.parseKey(key);
      const target = order === undefined ? byId.get(key) : byOrder.get(order);
      if (target === undefined) {
        throw new UnprocessableEntityException('Una de las respuestas no corresponde a una pregunta del checklist.');
      }
      const result = value?.result === undefined ? undefined : ChecklistMapper.toDb(value.result);
      if (result === undefined) {
        continue;
      }
      planned.push({ pregunta: target, result, comment: value?.comment ?? null, evidencias: value?.evidencias ?? [] });
    }
    return planned;
  }

  private async questions(context: AuditoriaContext, executor: DbExecutor): Promise<PreguntaRow[]> {
    return executor
      .select()
      .from(pregunta)
      .where(eq(pregunta.plantillaId, context.auditoria.plantillaId))
      .orderBy(asc(pregunta.orden));
  }

  private async assertAuditor(user: TokenPayload, executor: DbExecutor): Promise<void> {
    const [row] = await executor.select({ id: auditor.usuarioId }).from(auditor).where(eq(auditor.usuarioId, user.sub));
    if (row === undefined) {
      throw new ForbiddenException('Su usuario no tiene ficha de auditor, por lo que no puede responder el checklist.');
    }
  }

  private async currentVersion(executor: DbExecutor, auditoriaId: string): Promise<number> {
    const rows = await executor
      .select({ version: respuestaEvidencia.version })
      .from(respuestaEvidencia)
      .where(eq(respuestaEvidencia.auditoriaId, auditoriaId));
    return ChecklistProgress.version(rows.map((row) => row.version));
  }

  private result(
    aplicadas: number,
    sinCambios: number,
    repetida: boolean,
    version: number,
    total: number,
    respondidas: number,
  ): ChecklistSaveResult {
    return {
      aplicadas,
      sinCambios,
      repetida,
      version,
      progreso: ChecklistProgress.compute(total, respondidas),
    };
  }
}

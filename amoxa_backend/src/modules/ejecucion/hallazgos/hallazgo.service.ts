import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import {
  aceptacionHallazgo,
  adjunto,
  hallazgo,
  proceso,
  respuestaEvidencia,
  revisionHallazgo,
  usuario,
} from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { CrearHallazgoInput } from '@validators-ejecucion/crear-hallazgo.schema.js';
import type { RevisarHallazgoInput } from '@validators-ejecucion/revisar-hallazgo.schema.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import type { AuditoriaContext } from '@ejecucion-acceso-auditoria/auditoria-context.js';
import { AuditTransitions } from '@ejecucion-reglas/audit-transitions.js';
import { BusinessRule } from '@ejecucion-reglas/business-rule.js';
import { FindingRules } from '@ejecucion-reglas/finding-rules.js';
import type { HallazgoView } from '@ejecucion-hallazgos/hallazgo-view.js';

type HallazgoRow = typeof hallazgo.$inferSelect;

@Injectable()
export class HallazgoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccessService,
    private readonly versions: RecordVersionService,
  ) {}

  public async list(auditoriaId: string, user: TokenPayload, executor: DbExecutor = this.db): Promise<HallazgoView[]> {
    const context = await this.access.loadAsMember(auditoriaId, user, executor);
    const scope = user.rol === 'auditado' ? await this.access.ownedProcessIds(context, user.sub, executor) : undefined;
    return this.build(context, executor, scope);
  }

  public async build(
    context: AuditoriaContext,
    executor: DbExecutor = this.db,
    procesoIds?: readonly string[],
  ): Promise<HallazgoView[]> {
    const rows = await executor
      .select({ row: hallazgo, proceso: proceso.nombre, verificada: respuestaEvidencia.verificada })
      .from(hallazgo)
      .innerJoin(proceso, eq(proceso.id, hallazgo.procesoId))
      .innerJoin(respuestaEvidencia, eq(respuestaEvidencia.id, hallazgo.respuestaId))
      .where(eq(hallazgo.auditoriaId, context.auditoria.id))
      .orderBy(asc(hallazgo.creadoEn), asc(hallazgo.id));
    const visible = procesoIds === undefined ? rows : rows.filter((item) => procesoIds.includes(item.row.procesoId));
    if (visible.length === 0) {
      return [];
    }

    const ids = visible.map((item) => item.row.id);
    const answerIds = [...new Set(visible.map((item) => item.row.respuestaId))];
    const counts = await executor
      .select({ respuestaId: adjunto.respuestaId, total: count() })
      .from(adjunto)
      .where(inArray(adjunto.respuestaId, answerIds))
      .groupBy(adjunto.respuestaId);
    const reviews = await executor
      .select({ row: revisionHallazgo, autor: usuario.nombre })
      .from(revisionHallazgo)
      .innerJoin(usuario, eq(usuario.id, revisionHallazgo.revisadoPorId))
      .where(inArray(revisionHallazgo.hallazgoId, ids))
      .orderBy(asc(revisionHallazgo.creadaEn));
    const acceptances = await executor
      .select({ row: aceptacionHallazgo, autor: usuario.nombre })
      .from(aceptacionHallazgo)
      .innerJoin(usuario, eq(usuario.id, aceptacionHallazgo.usuarioId))
      .where(inArray(aceptacionHallazgo.hallazgoId, ids))
      .orderBy(asc(aceptacionHallazgo.creadaEn));
    const countByAnswer = new Map(counts.map((item) => [item.respuestaId, Number(item.total)]));

    return visible.map((item) => {
      const own = reviews.filter((review) => review.row.hallazgoId === item.row.id);
      const closing = own.filter((review) => review.row.momento === 'cierre' && review.row.resultadoArea !== null);
      const last = closing.at(-1);
      const evidenceCount = countByAnswer.get(item.row.respuestaId) ?? 0;
      return {
        id: item.row.id,
        auditoriaId: item.row.auditoriaId,
        respuestaId: item.row.respuestaId,
        procesoId: item.row.procesoId,
        proceso: item.proceso,
        kind: FindingRules.kindOf(item.row),
        tipo: item.row.tipo,
        clasificacion: item.row.clasificacion,
        clausula: item.row.criterioIncumplido,
        descripcion: item.row.descripcion,
        confirmado: item.row.confirmado,
        discrepancia: item.row.discrepancia,
        estado: item.row.estado,
        evidenciaCount: evidenceCount,
        evidenciasVerificadas: item.verificada && evidenceCount > 0,
        revisado: last !== undefined,
        resultadoArea: last?.row.resultadoArea ?? null,
        revisiones: own.map((review) => ({
          momento: review.row.momento,
          resultadoArea: review.row.resultadoArea,
          comentario: review.row.comentario,
          revisadoPor: review.autor,
          fecha: review.row.creadaEn.toISOString(),
        })),
        aceptaciones: acceptances
          .filter((acceptance) => acceptance.row.hallazgoId === item.row.id)
          .map((acceptance) => ({
            usuarioId: acceptance.row.usuarioId,
            usuario: acceptance.autor,
            acepta: acceptance.row.acepta,
            motivo: acceptance.row.motivo,
            fecha: acceptance.row.creadaEn.toISOString(),
          })),
      };
    });
  }

  public async create(auditoriaId: string, user: TokenPayload, input: CrearHallazgoInput): Promise<HallazgoView> {
    const createdId = await this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));

      const [answer] = await tx
        .select()
        .from(respuestaEvidencia)
        .where(and(eq(respuestaEvidencia.id, input.respuesta_id), eq(respuestaEvidencia.auditoriaId, auditoriaId)))
        .limit(1);
      if (answer === undefined) {
        throw new NotFoundException('La respuesta de origen no existe en esta auditoría.');
      }
      const [files] = await tx.select({ total: count() }).from(adjunto).where(eq(adjunto.respuestaId, answer.id));
      const verified = answer.verificada && Number(files.total) > 0;

      const violations = FindingRules.violations({
        kind: input.tipo,
        clausula: input.clausula,
        evidenciaVerificada: verified,
      });
      if (violations.length > 0) {
        throw BusinessRule.violation(
          violations.map((item) => item.message).join(' '),
          violations.map((item) => item.code).join(','),
        );
      }

      const procesoId = this.resolveProcess(context, input.proceso);
      const resolved = FindingRules.resolve(input.tipo);
      const [row] = await tx
        .insert(hallazgo)
        .values({
          auditoriaId,
          respuestaId: answer.id,
          procesoId,
          tipo: resolved.tipo,
          clasificacion: resolved.clasificacion,
          categoria: resolved.categoria,
          criterioIncumplido: input.clausula ?? null,
          descripcion: input.descripcion,
          creadoPorId: user.sub,
        })
        .returning();
      await this.recordVersion(tx, row, user);
      return row.id;
    });
    const context = await this.access.load(auditoriaId, user);
    const [created] = (await this.build(context)).filter((item) => item.id === createdId);
    return created;
  }

  public async review(hallazgoId: string, user: TokenPayload, input: RevisarHallazgoInput): Promise<HallazgoView> {
    const [found] = await this.db.select().from(hallazgo).where(eq(hallazgo.id, hallazgoId)).limit(1);
    if (found === undefined) {
      throw new NotFoundException('Hallazgo no encontrado');
    }
    await this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(found.auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      const [row] = await tx
        .insert(revisionHallazgo)
        .values({ hallazgoId, momento: 'previa', comentario: input.comentario ?? null, revisadoPorId: user.sub })
        .returning();
      await this.versions.record(
        {
          entidadTipo: 'revision_hallazgo',
          entidadId: row.id,
          creadoPorId: user.sub,
          contenido: { hallazgoId, momento: row.momento, comentario: row.comentario },
        },
        tx,
      );
    });
    const context = await this.access.load(found.auditoriaId, user);
    const [view] = (await this.build(context)).filter((item) => item.id === hallazgoId);
    return view;
  }

  private resolveProcess(context: AuditoriaContext, requested: string | undefined): string {
    if (requested !== undefined) {
      if (!context.procesoIds.includes(requested)) {
        throw BusinessRule.violation('El proceso indicado no forma parte del alcance de esta auditoría.');
      }
      return requested;
    }
    if (context.procesoIds.length === 1) {
      return context.procesoIds[0];
    }
    throw BusinessRule.violation('Indique el proceso al que corresponde el hallazgo.');
  }

  private async recordVersion(tx: DbExecutor, row: HallazgoRow, user: TokenPayload): Promise<void> {
    await this.versions.record(
      {
        entidadTipo: 'hallazgo',
        entidadId: row.id,
        creadoPorId: user.sub,
        contenido: {
          auditoriaId: row.auditoriaId,
          respuestaId: row.respuestaId,
          procesoId: row.procesoId,
          tipo: row.tipo,
          clasificacion: row.clasificacion,
          categoria: row.categoria,
          criterioIncumplido: row.criterioIncumplido,
          descripcion: row.descripcion,
          confirmado: row.confirmado,
          discrepancia: row.discrepancia,
          estado: row.estado,
        },
      },
      tx,
    );
  }
}

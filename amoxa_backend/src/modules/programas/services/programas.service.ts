import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { programaAuditoria, programaProceso } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { ProgramaBody } from '@validators-programas/programa-body.schema.js';
import { FrequencySuggester } from '@programas-rules/frequency-suggester.js';
import { ProgramaCompleteness } from '@programas-rules-programa/programa-completeness.js';
import { ProgramaStatus } from '@programas-rules-programa/programa-status.js';
import { PriorityScorer, type RankedProcess } from '@programas-rules/priority-scorer.js';
import { ProgramaMapper } from '@programas-mappers-programa/programa-mapper.js';
import type { ProgramaRow, ProgramaView } from '@programas-mappers-programa/programa-view.js';
import { ProgramaQueryService } from '@programas-services-programa/programa-query.service.js';

type ProgramaValues = Partial<typeof programaAuditoria.$inferInsert>;

@Injectable()
export class ProgramasService {
  public static readonly ENTITY_TYPE = 'programa_auditoria';

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: ProgramaQueryService,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async create(user: TokenPayload, body: ProgramaBody): Promise<ProgramaView> {
    return this.db.transaction(async (tx) => {
      const row = await this.persist(tx, user, undefined, body, {});
      return this.finish(tx, user, row);
    });
  }

  public async update(id: string, user: TokenPayload, body: ProgramaBody): Promise<ProgramaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.query.find(id, user.organizacionId, 'gestor', tx);
      if (!ProgramaStatus.canEdit(current.estado)) {
        throw new ConflictException(
          `El programa está ${ProgramaStatus.label(current.estado).toLowerCase()} y ya no se puede editar.`,
        );
      }
      const row = await this.persist(tx, user, current, body, {});
      return this.finish(tx, user, row);
    });
  }

  public async send(id: string, user: TokenPayload, body: ProgramaBody): Promise<ProgramaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.query.find(id, user.organizacionId, 'gestor', tx);
      if (!ProgramaStatus.canSend(current.estado)) {
        throw new ConflictException(
          `El programa está ${ProgramaStatus.label(current.estado).toLowerCase()} y no se puede enviar a aprobación.`,
        );
      }
      const row = await this.persist(tx, user, current, body, {
        estado: 'pendiente_aprobacion',
        enviadoEn: new Date(),
        motivoDevolucion: null,
      });
      const missing = ProgramaCompleteness.missing(row);
      if (missing.length > 0) {
        throw new UnprocessableEntityException(
          `El programa tiene datos incompletos y no se puede enviar a aprobación. Falta: ${missing.join(', ')}.`,
        );
      }
      if (row.prioridadModificada && (row.justificacionPrioridad ?? '').trim() === '') {
        throw new UnprocessableEntityException(
          'Cambiar la prioridad o la frecuencia sugeridas requiere una justificación.',
        );
      }
      const view = await this.finish(tx, user, row);
      await this.notifications.notifyRole(
        user.organizacionId,
        'direccion',
        {
          tipo: 'programa_pendiente_aprobacion',
          titulo: 'Programa pendiente de aprobación',
          mensaje: `El programa de auditoría ${row.periodo} está pendiente de su aprobación.`,
          entidadTipo: ProgramasService.ENTITY_TYPE,
          entidadId: row.id,
        },
        tx,
      );
      return view;
    });
  }

  public async approve(id: string, user: TokenPayload): Promise<ProgramaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.query.find(id, user.organizacionId, 'direccion', tx);
      this.assertPending(current);
      const now = new Date();
      const [row] = await tx
        .update(programaAuditoria)
        .set({
          estado: 'aprobado',
          aprobadoPorId: user.sub,
          aprobadoEn: now,
          fechaAprobacion: now.toISOString().slice(0, 10),
          motivoDevolucion: null,
          version: sql`${programaAuditoria.version} + 1`,
        })
        .where(and(eq(programaAuditoria.id, id), eq(programaAuditoria.organizacionId, user.organizacionId)))
        .returning();
      const view = await this.finish(tx, user, row);
      await this.notifications.notifyRole(
        user.organizacionId,
        'gestor',
        {
          tipo: 'programa_aprobado',
          titulo: 'Programa aprobado',
          mensaje: `La dirección aprobó el programa de auditoría ${row.periodo}.`,
          entidadTipo: ProgramasService.ENTITY_TYPE,
          entidadId: row.id,
        },
        tx,
      );
      return view;
    });
  }

  public async giveBack(id: string, user: TokenPayload, motivo: string | undefined): Promise<ProgramaView> {
    if (motivo === undefined || motivo.trim() === '') {
      throw new UnprocessableEntityException('Explique por qué devuelve el programa.');
    }
    return this.db.transaction(async (tx) => {
      const current = await this.query.find(id, user.organizacionId, 'direccion', tx);
      this.assertPending(current);
      const [row] = await tx
        .update(programaAuditoria)
        .set({
          estado: 'devuelto',
          motivoDevolucion: motivo.trim(),
          aprobadoPorId: null,
          aprobadoEn: null,
          fechaAprobacion: null,
          version: sql`${programaAuditoria.version} + 1`,
        })
        .where(and(eq(programaAuditoria.id, id), eq(programaAuditoria.organizacionId, user.organizacionId)))
        .returning();
      const view = await this.finish(tx, user, row);
      await this.notifications.notifyRole(
        user.organizacionId,
        'gestor',
        {
          tipo: 'programa_devuelto',
          titulo: 'Programa devuelto',
          mensaje: `La dirección devolvió el programa ${row.periodo}. Motivo: ${motivo.trim()}`,
          entidadTipo: ProgramasService.ENTITY_TYPE,
          entidadId: row.id,
        },
        tx,
      );
      return view;
    });
  }

  private assertPending(row: ProgramaRow): void {
    if (!ProgramaStatus.canDecide(row.estado)) {
      throw new ConflictException('Solo se puede decidir sobre un programa pendiente de aprobación.');
    }
  }

  private async finish(executor: DbExecutor, user: TokenPayload, row: ProgramaRow): Promise<ProgramaView> {
    const detail = await this.query.detailOf(row, executor);
    await this.versions.record(
      {
        entidadTipo: ProgramasService.ENTITY_TYPE,
        entidadId: row.id,
        creadoPorId: user.sub,
        contenido: ProgramaMapper.snapshot(detail),
      },
      executor,
    );
    return ProgramaMapper.toView(detail);
  }

  private async persist(
    executor: DbExecutor,
    user: TokenPayload,
    current: ProgramaRow | undefined,
    body: ProgramaBody,
    extra: ProgramaValues,
  ): Promise<ProgramaRow> {
    const organizacionId = user.organizacionId;
    const periodo = body.periodo ?? current?.periodo;
    if (periodo === undefined) {
      throw new UnprocessableEntityException('Indique el periodo del programa.');
    }
    if (await this.query.periodTaken(organizacionId, periodo, current?.id, executor)) {
      throw new ConflictException(`Ya existe un programa para el periodo ${periodo}.`);
    }

    const ranking = await this.query.ranking(organizacionId, executor);
    const existing = current === undefined ? [] : await this.query.processes(current.id, executor);
    const requested = this.requestedProcesses(body, existing.map((entry) => entry.procesoId), ranking);
    const suggestedFrequency = FrequencySuggester.suggest(ranking);
    const frequencyChanged = body.frecuencia !== undefined && body.frecuencia !== suggestedFrequency;
    const processesChanged = body.procesos_prioritarios !== undefined && PriorityScorer.isModified(requested, ranking);
    const flagged = (body.prioridad_modificada ?? current?.prioridadModificada ?? false) || frequencyChanged || processesChanged;

    const values: ProgramaValues = {
      periodo,
      prioridadModificada: flagged,
      frecuencia: body.frecuencia ?? current?.frecuencia ?? suggestedFrequency,
      ...(body.objetivos !== undefined && { objetivos: body.objetivos }),
      ...(body.riesgos !== undefined && { riesgosOportunidades: body.riesgos }),
      ...(body.metodos !== undefined && { metodos: body.metodos }),
      ...(body.fecha_inicio !== undefined && { fechaInicio: body.fecha_inicio }),
      ...(body.fecha_fin !== undefined && { fechaFin: body.fecha_fin }),
      ...(body.justificacion_prioridad !== undefined && { justificacionPrioridad: body.justificacion_prioridad }),
      ...extra,
    };

    let row: ProgramaRow;
    if (current === undefined) {
      [row] = await executor
        .insert(programaAuditoria)
        .values({ ...values, periodo, organizacionId, creadoPorId: user.sub })
        .returning();
    } else {
      [row] = await executor
        .update(programaAuditoria)
        .set({ ...values, version: sql`${programaAuditoria.version} + 1` })
        .where(and(eq(programaAuditoria.id, current.id), eq(programaAuditoria.organizacionId, organizacionId)))
        .returning();
    }

    if (current === undefined || body.procesos_prioritarios !== undefined || existing.length === 0) {
      await this.replaceProcesses(executor, row.id, requested, ranking);
    }
    return row;
  }

  private requestedProcesses(body: ProgramaBody, existing: string[], ranking: readonly RankedProcess[]): string[] {
    const requested = body.procesos_prioritarios ?? (existing.length > 0 ? existing : ranking.map((entry) => entry.id));
    const known = new Set(ranking.map((entry) => entry.id));
    if (requested.some((id) => !known.has(id))) {
      throw new UnprocessableEntityException('Uno de los procesos elegidos no pertenece a su organización.');
    }
    return requested;
  }

  private async replaceProcesses(
    executor: DbExecutor,
    programaId: string,
    ids: readonly string[],
    ranking: readonly RankedProcess[],
  ): Promise<void> {
    const retirement = and(eq(programaProceso.programaId, programaId), isNull(programaProceso.retiradoEn));
    await executor
      .update(programaProceso)
      .set({ retiradoEn: new Date() })
      .where(ids.length === 0 ? retirement : and(retirement, notInArray(programaProceso.procesoId, [...ids])));
    if (ids.length === 0) {
      return;
    }
    const scores = new Map(ranking.map((entry) => [entry.id, entry.puntaje]));
    await executor
      .insert(programaProceso)
      .values(
        ids.map((procesoId, index) => ({
          programaId,
          procesoId,
          orden: index + 1,
          puntajeSugerido: scores.get(procesoId) ?? 0,
        })),
      )
      .onConflictDoUpdate({
        target: [programaProceso.programaId, programaProceso.procesoId],
        set: { orden: sql`excluded.orden`, puntajeSugerido: sql`excluded.puntaje_sugerido`, retiradoEn: null },
      });
  }
}

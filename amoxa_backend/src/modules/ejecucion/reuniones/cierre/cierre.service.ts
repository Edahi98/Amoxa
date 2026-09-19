import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { aceptacionHallazgo, auditoria, hallazgo, revisionHallazgo } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { AceptarHallazgosInput } from '@validators-ejecucion-cierre/aceptar-hallazgos.schema.js';
import type { AnotarRevisionInput } from '@validators-ejecucion-cierre/anotar-revision.schema.js';
import type { CerrarAuditoriaInput } from '@validators-ejecucion-cierre/cerrar-auditoria.schema.js';
import type { DiscreparInput } from '@validators-ejecucion-cierre/discrepar.schema.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import type { AuditoriaContext } from '@ejecucion-acceso-auditoria/auditoria-context.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import { AuditTransitions } from '@ejecucion-reglas/audit-transitions.js';
import { BusinessRule } from '@ejecucion-reglas/business-rule.js';
import { ClosureEligibility } from '@ejecucion-reglas/closure-eligibility.js';
import { MeetingRules } from '@ejecucion-reglas/meeting-rules.js';
import { ReunionService } from '@ejecucion-reuniones/reunion.service.js';
import type { ReunionView } from '@ejecucion-reuniones/reunion-view.js';

type HallazgoRow = typeof hallazgo.$inferSelect;

export interface ClosureReviewResult {
  hallazgoId: string;
  resultadoArea: 'aceptado' | 'discrepa';
  pendientes: number;
}

export interface AcceptanceResult {
  hallazgos: string[];
}

export interface ClosureResult {
  auditoriaId: string;
  estado: 'cerrada';
  reunion: ReunionView;
}

@Injectable()
export class CierreService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccessService,
    private readonly reuniones: ReunionService,
    private readonly hallazgos: HallazgoService,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async annotateReview(
    auditoriaId: string,
    user: TokenPayload,
    input: AnotarRevisionInput,
  ): Promise<ClosureReviewResult> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      BusinessRule.assert(MeetingRules.resultViolation(input.resultado_area), 'REVISION_SIN_RESULTADO');
      const target = await this.findFinding(tx, auditoriaId, input.hallazgo_id);
      const resultado = input.resultado_area as 'aceptado' | 'discrepa';

      const reunion = await this.reuniones.getOrCreate(tx, context.auditoria, 'cierre', user);
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'preside', user.sub, true);
      const [row] = await tx
        .insert(revisionHallazgo)
        .values({
          hallazgoId: target.id,
          momento: 'cierre',
          resultadoArea: resultado,
          comentario: input.comentario ?? null,
          revisadoPorId: user.sub,
        })
        .returning();
      await this.versions.record(
        {
          entidadTipo: 'revision_hallazgo',
          entidadId: row.id,
          creadoPorId: user.sub,
          contenido: {
            hallazgoId: row.hallazgoId,
            momento: row.momento,
            resultadoArea: row.resultadoArea,
            comentario: row.comentario,
          },
        },
        tx,
      );
      const evaluation = ClosureEligibility.evaluate(await this.hallazgos.build(context, tx));
      return { hallazgoId: target.id, resultadoArea: resultado, pendientes: evaluation.pendientes.length };
    });
  }

  public async attend(auditoriaId: string, user: TokenPayload): Promise<ReunionView> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      const reunion = await this.reuniones.getOrCreate(tx, context.auditoria, 'cierre', user);
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'asiste', user.sub, true);
      return this.reuniones.viewOf(context, 'cierre', tx);
    });
  }

  public async accept(auditoriaId: string, user: TokenPayload, input: AceptarHallazgosInput): Promise<AcceptanceResult> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      const targets = await this.areaFindings(tx, context, user, input.hallazgo_id);
      const reunion = await this.reuniones.getOrCreate(tx, context.auditoria, 'cierre', user);
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'asiste', user.sub, true);
      for (const target of targets) {
        await this.decide(tx, target, user, true, null);
      }
      return { hallazgos: targets.map((item) => item.id) };
    });
  }

  public async discrepar(auditoriaId: string, user: TokenPayload, input: DiscreparInput): Promise<AcceptanceResult> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      BusinessRule.assert(MeetingRules.motiveViolation(input.motivo_discrepancia), 'DISCREPANCIA_SIN_MOTIVO');
      const targets = await this.areaFindings(tx, context, user, input.hallazgo_id);
      const reunion = await this.reuniones.getOrCreate(tx, context.auditoria, 'cierre', user);
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'asiste', user.sub, true);
      for (const target of targets) {
        await this.decide(tx, target, user, false, input.motivo_discrepancia ?? null);
      }
      await this.notifications.notifyUsers(
        [context.auditoria.liderId],
        {
          tipo: 'hallazgo_discrepancia',
          titulo: 'Discrepancia en un hallazgo',
          mensaje: 'El dueño del proceso dejó por escrito su desacuerdo con un hallazgo de la auditoría.',
          entidadTipo: 'hallazgo',
          entidadId: targets[0].id,
        },
        tx,
      );
      return { hallazgos: targets.map((item) => item.id) };
    });
  }

  public async close(auditoriaId: string, user: TokenPayload, input: CerrarAuditoriaInput): Promise<ClosureResult> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.closeViolation(context.auditoria.estado));
      const evaluation = ClosureEligibility.evaluate(await this.hallazgos.build(context, tx));
      BusinessRule.assert(evaluation.message, 'HALLAZGOS_SIN_REVISAR');

      const attendees = MeetingRules.attendees(input.asistentes, user.sub);
      await this.reuniones.assertSameOrganization(tx, user.organizacionId, attendees);
      const reunion = await this.reuniones.getOrCreate(tx, context.auditoria, 'cierre', user);
      await this.reuniones.updateNotes(tx, reunion, input.notas, user);
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'preside', user.sub, true);
      for (const attendee of attendees) {
        await this.reuniones.addAttendance(tx, reunion.id, attendee, 'asiste', user.sub, false);
      }

      const [closed] = await tx
        .update(auditoria)
        .set({ estado: 'cerrada', fechaReal: context.auditoria.fechaReal ?? new Date().toISOString().slice(0, 10) })
        .where(eq(auditoria.id, auditoriaId))
        .returning();
      await this.versions.record(
        {
          entidadTipo: 'auditoria',
          entidadId: closed.id,
          creadoPorId: user.sub,
          contenido: { estado: closed.estado, fechaReal: closed.fechaReal, motivo: 'cierre' },
        },
        tx,
      );
      const notice = {
        tipo: 'auditoria_cerrada',
        titulo: 'Auditoría cerrada',
        mensaje: 'La auditoría se cerró y el informe ya puede generarse.',
        entidadTipo: 'auditoria',
        entidadId: auditoriaId,
      };
      await this.notifications.notifyUsers([context.auditoria.liderId], notice, tx);
      await this.notifications.notifyRole(user.organizacionId, 'direccion', notice, tx);
      return {
        auditoriaId,
        estado: 'cerrada',
        reunion: await this.reuniones.viewOf({ ...context, auditoria: closed }, 'cierre', tx),
      };
    });
  }

  private async decide(
    tx: DbExecutor,
    target: HallazgoRow,
    user: TokenPayload,
    acepta: boolean,
    motivo: string | null,
  ): Promise<void> {
    const [decision] = await tx
      .insert(aceptacionHallazgo)
      .values({ hallazgoId: target.id, usuarioId: user.sub, acepta, motivo })
      .onConflictDoUpdate({
        target: [aceptacionHallazgo.hallazgoId, aceptacionHallazgo.usuarioId],
        set: { acepta, motivo, creadaEn: new Date() },
      })
      .returning();
    await this.versions.record(
      {
        entidadTipo: 'aceptacion_hallazgo',
        entidadId: decision.id,
        creadoPorId: user.sub,
        contenido: { hallazgoId: target.id, acepta, motivo },
      },
      tx,
    );
    const [updated] = await tx
      .update(hallazgo)
      .set({ confirmado: acepta, discrepancia: acepta ? null : motivo })
      .where(eq(hallazgo.id, target.id))
      .returning();
    await this.versions.record(
      {
        entidadTipo: 'hallazgo',
        entidadId: updated.id,
        creadoPorId: user.sub,
        contenido: {
          auditoriaId: updated.auditoriaId,
          respuestaId: updated.respuestaId,
          procesoId: updated.procesoId,
          tipo: updated.tipo,
          clasificacion: updated.clasificacion,
          categoria: updated.categoria,
          criterioIncumplido: updated.criterioIncumplido,
          descripcion: updated.descripcion,
          confirmado: updated.confirmado,
          discrepancia: updated.discrepancia,
          estado: updated.estado,
        },
      },
      tx,
    );
  }

  private async areaFindings(
    tx: DbExecutor,
    context: AuditoriaContext,
    user: TokenPayload,
    hallazgoId: string | undefined,
  ): Promise<HallazgoRow[]> {
    const owned = await this.access.ownedProcessIds(context, user.sub, tx);
    if (hallazgoId !== undefined) {
      const target = await this.findFinding(tx, context.auditoria.id, hallazgoId);
      if (!owned.includes(target.procesoId)) {
        throw new ForbiddenException('El hallazgo no corresponde a un proceso de su área.');
      }
      return [target];
    }
    const all = await tx.select().from(hallazgo).where(eq(hallazgo.auditoriaId, context.auditoria.id));
    const mine = all.filter((item) => owned.includes(item.procesoId));
    if (mine.length === 0) {
      throw BusinessRule.violation('No hay hallazgos de su área por aceptar.');
    }
    return mine;
  }

  private async findFinding(tx: DbExecutor, auditoriaId: string, hallazgoId: string): Promise<HallazgoRow> {
    const [row] = await tx
      .select()
      .from(hallazgo)
      .where(and(eq(hallazgo.id, hallazgoId), eq(hallazgo.auditoriaId, auditoriaId)))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException('Hallazgo no encontrado');
    }
    return row;
  }
}

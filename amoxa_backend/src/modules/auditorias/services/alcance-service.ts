import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, auditoriaProceso, plantillaChecklist, proceso, revisionAlcance } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import type { AlcanceInput } from '@validators-auditorias-alcance/alcance.schema.js';
import type { AlcanceRevisionInput } from '@validators-auditorias-alcance/alcance-revision.schema.js';
import { RuleViolation } from '@auditorias-errors/rule-violation.js';
import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import { ScopeCompleteness } from '@auditorias-rules/scope-completeness.js';
import { TeamEligibility } from '@auditorias-rules/team-eligibility.js';
import { TemplateVigency } from '@auditorias-rules/template-vigency.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';
import { TeamCandidateLoader } from '@auditorias-services/team-candidate-loader.js';
import { TodayClock } from '@auditorias-services/today-clock.js';

@Injectable()
export class AlcanceService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccess,
    private readonly recorder: AuditoriaRecorder,
    private readonly notifications: NotificationService,
  ) {}

  public async define(id: string, input: AlcanceInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asLeader(id, user);
    if (!AuditStatusTransitions.isPlanning(actual.estado)) {
      throw RuleViolation.unprocessable(
        'AUDITORIA_NO_PLANIFICABLE',
        `La auditoría está ${AuditStatusTransitions.describe(actual.estado)}: su alcance ya no se puede cambiar.`,
      );
    }
    if (!PlanStatusTransitions.canEditScope(actual.plan.estado)) {
      throw RuleViolation.unprocessable(
        'ALCANCE_BLOQUEADO',
        `El plan está ${PlanStatusTransitions.describe(actual.plan.estado)}: el alcance no se puede cambiar mientras tanto.`,
      );
    }

    const procesoIds = [...new Set(input.procesos)];
    const plantilla =
      input.plantilla_id === undefined
        ? undefined
        : (await this.db.select({ vigente: plantillaChecklist.vigente }).from(plantillaChecklist).where(eq(plantillaChecklist.id, input.plantilla_id)).limit(1))[0];

    const gaps = ScopeCompleteness.missing({
      procesoIds,
      criterios: input.criterios,
      plantillaVigente: TemplateVigency.isCurrent(plantilla),
      metodo: input.metodo,
    });
    if (gaps.length > 0) {
      throw RuleViolation.fromGaps(gaps);
    }

    const valid = await this.db
      .select({ id: proceso.id })
      .from(proceso)
      .where(and(inArray(proceso.id, procesoIds), eq(proceso.organizacionId, user.organizacionId)));
    if (valid.length !== procesoIds.length) {
      throw RuleViolation.unprocessable('PROCESO_INVALIDO', 'Alguno de los procesos elegidos no pertenece a la organización.');
    }

    await this.assertTeamStillEligible(actual, procesoIds, user);

    return this.db.transaction(async (tx) => {
      await tx
        .update(auditoria)
        .set({
          plantillaId: input.plantilla_id,
          criterios: input.criterios,
          metodo: input.metodo,
          objetivos: input.objetivos ?? actual.objetivos,
        })
        .where(eq(auditoria.id, id));

      const previous = actual.procesos.map((item) => item.id);
      const removed = previous.filter((procesoId) => !procesoIds.includes(procesoId));
      const added = procesoIds.filter((procesoId) => !previous.includes(procesoId));
      if (removed.length > 0) {
        await tx
          .update(auditoriaProceso)
          .set({ retiradoEn: new Date() })
          .where(and(eq(auditoriaProceso.auditoriaId, id), inArray(auditoriaProceso.procesoId, removed), isNull(auditoriaProceso.retiradoEn)));
      }
      if (added.length > 0) {
        await tx
          .insert(auditoriaProceso)
          .values(added.map((procesoId) => ({ auditoriaId: id, procesoId })))
          .onConflictDoUpdate({
            target: [auditoriaProceso.auditoriaId, auditoriaProceso.procesoId],
            set: { retiradoEn: null },
          });
      }
      await tx
        .update(revisionAlcance)
        .set({ revisadoPorId: null, revisadoEn: null, comentario: null })
        .where(eq(revisionAlcance.auditoriaId, id));

      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyRole(
        user.organizacionId,
        'gestor',
        {
          tipo: 'alcance_definido',
          titulo: 'Alcance por revisar',
          mensaje: `El líder ${detalle.liderNombre} definió el alcance, los criterios y el método de una auditoría del programa ${detalle.periodo}.`,
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }

  public async review(id: string, input: AlcanceRevisionInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asManager(id, user);
    const gaps = ScopeCompleteness.missing({
      procesoIds: actual.procesos.map((item) => item.id),
      criterios: actual.criterios,
      plantillaVigente: TemplateVigency.isCurrent(actual.plantilla),
      metodo: actual.metodo,
    });
    if (gaps.length > 0) {
      throw RuleViolation.fromGaps(gaps);
    }
    return this.db.transaction(async (tx) => {
      await tx
        .insert(revisionAlcance)
        .values({ auditoriaId: id, revisadoPorId: user.sub, revisadoEn: new Date(), comentario: input.comentario ?? null })
        .onConflictDoUpdate({
          target: revisionAlcance.auditoriaId,
          set: { revisadoPorId: user.sub, revisadoEn: new Date(), comentario: input.comentario ?? null },
        });
      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyUsers(
        [detalle.liderId],
        {
          tipo: 'alcance_revisado',
          titulo: 'Alcance revisado',
          mensaje: 'El gestor revisó el alcance, los criterios y el método de la auditoría.',
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }

  private async assertTeamStillEligible(actual: AuditoriaDetalle, procesoIds: readonly string[], user: TokenPayload): Promise<void> {
    const memberIds = actual.equipo.map((member) => member.auditorId);
    const candidates = await TeamCandidateLoader.byIds(memberIds, user.organizacionId, this.db);
    const conflicts = TeamEligibility.conflicts(memberIds, candidates, procesoIds, TodayClock.isoDate());
    if (conflicts.length > 0) {
      throw RuleViolation.unprocessable(
        'EQUIPO_CON_CONFLICTO',
        `El nuevo alcance deja en conflicto a integrantes del equipo: ${conflicts.map((item) => `${item.nombre} (${item.motivo})`).join(' ')}`,
        { conflictos: conflicts },
      );
    }
  }
}

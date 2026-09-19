import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { equipoAuditoria } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { EquipoInput } from '@validators-auditorias/equipo.schema.js';
import { RuleViolation } from '@auditorias-errors/rule-violation.js';
import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import { TeamEligibility } from '@auditorias-rules/team-eligibility.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';
import { TeamCandidateLoader } from '@auditorias-services/team-candidate-loader.js';
import { TodayClock } from '@auditorias-services/today-clock.js';

@Injectable()
export class EquipoService {
  public static readonly ATTEMPT_ENTITY = 'intento_asignacion_equipo';

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccess,
    private readonly recorder: AuditoriaRecorder,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async assign(id: string, input: EquipoInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asManager(id, user);
    if (!AuditStatusTransitions.isPlanning(actual.estado)) {
      throw RuleViolation.unprocessable(
        'AUDITORIA_NO_PLANIFICABLE',
        `La auditoría está ${AuditStatusTransitions.describe(actual.estado)}: el equipo ya no se puede cambiar.`,
      );
    }
    if (!PlanStatusTransitions.canEditScope(actual.plan.estado)) {
      throw RuleViolation.unprocessable(
        'EQUIPO_BLOQUEADO',
        `El plan está ${PlanStatusTransitions.describe(actual.plan.estado)}: el equipo no se puede cambiar mientras tanto.`,
      );
    }

    const selected = [...new Set(input.miembros)];
    if (selected.length === 0) {
      throw RuleViolation.unprocessable('EQUIPO_VACIO', 'Elija al menos un auditor para el equipo.');
    }

    const candidates = await TeamCandidateLoader.byIds(selected, user.organizacionId, this.db);
    const conflicts = TeamEligibility.conflicts(
      selected,
      candidates,
      actual.procesos.map((item) => item.id),
      TodayClock.isoDate(),
    );
    if (conflicts.length > 0) {
      await this.versions.record({
        entidadTipo: EquipoService.ATTEMPT_ENTITY,
        entidadId: id,
        creadoPorId: user.sub,
        contenido: { intentados: selected, conflictos: conflicts },
      });
      throw RuleViolation.unprocessable(
        'EQUIPO_CON_CONFLICTO',
        `El equipo incluye personas que no pueden participar: ${conflicts.map((item) => `${item.nombre} (${item.motivo})`).join(' ')}`,
        { conflictos: conflicts },
      );
    }

    const previous = actual.equipo.map((member) => member.auditorId);
    const removed = previous.filter((auditorId) => !selected.includes(auditorId));
    const added = selected.filter((auditorId) => !previous.includes(auditorId));
    const withTasks = actual.plan.tareas.filter((task) => removed.includes(task.auditorId));
    if (withTasks.length > 0) {
      const names = actual.equipo.filter((member) => withTasks.some((task) => task.auditorId === member.auditorId)).map((member) => member.nombre);
      throw RuleViolation.unprocessable(
        'EQUIPO_CON_TAREAS',
        `No se puede retirar del equipo a quien ya tiene tareas en el plan: ${names.join(', ')}. Reasigne sus tareas primero.`,
      );
    }

    return this.db.transaction(async (tx) => {
      if (removed.length > 0) {
        await tx
          .update(equipoAuditoria)
          .set({ retiradoEn: new Date() })
          .where(and(eq(equipoAuditoria.auditoriaId, id), inArray(equipoAuditoria.auditorId, removed), isNull(equipoAuditoria.retiradoEn)));
      }
      if (added.length > 0) {
        await tx
          .insert(equipoAuditoria)
          .values(
            added.map((auditorId) => ({
              auditoriaId: id,
              auditorId,
              rol: TeamEligibility.roleFor(candidates.get(auditorId)!),
              imparcialidadOk: true,
            })),
          )
          .onConflictDoUpdate({
            target: [equipoAuditoria.auditoriaId, equipoAuditoria.auditorId],
            set: { rol: sql`excluded.rol`, imparcialidadOk: sql`excluded.imparcialidad_ok`, retiradoEn: null },
          });
      }
      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyUsers(
        [...added, detalle.liderId],
        {
          tipo: 'equipo_asignado',
          titulo: 'Equipo de auditoría asignado',
          mensaje: `El gestor asignó el equipo auditor de una auditoría del programa ${detalle.periodo}.`,
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }
}

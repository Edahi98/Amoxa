import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { agendaAuditoria, auditoria, planAuditoria, propuestaFechaPlan, tareaAuditoria } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import type { PlanInput } from '@validators-auditorias-plan/plan.schema.js';
import type { PlanPropuestaInput } from '@validators-auditorias-plan/plan-propuesta.schema.js';
import { RuleViolation } from '@auditorias-errors/rule-violation.js';
import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { PlanCompleteness } from '@auditorias-rules-plan/plan-completeness.js';
import { PlanStatusTransitions, type PlanStatus } from '@auditorias-rules-plan/plan-status-transitions.js';
import { PlanTextParser, type AgendaEntry, type TaskEntry } from '@auditorias-parsers/plan-text-parser.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditRecipients } from '@auditorias-services/audit-recipients.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';
import { TodayClock } from '@auditorias-services/today-clock.js';

@Injectable()
export class PlanService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccess,
    private readonly recorder: AuditoriaRecorder,
    private readonly notifications: NotificationService,
  ) {}

  public async save(id: string, input: PlanInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asLeader(id, user);
    this.assertPlanning(actual);
    if (!PlanStatusTransitions.canMove(actual.plan.estado, 'borrador')) {
      throw RuleViolation.unprocessable(
        'PLAN_BLOQUEADO',
        `El plan está ${PlanStatusTransitions.describe(actual.plan.estado)} y ya no se puede modificar.`,
      );
    }

    const fechaInicio = input.fecha_inicio ?? actual.plan.fechaInicio;
    const fechaFin = input.fecha_fin ?? actual.plan.fechaFin;
    if (fechaInicio !== null && fechaFin !== null && fechaFin < fechaInicio) {
      throw RuleViolation.unprocessable('PLAN_SIN_FECHAS', 'La fecha de fin del plan no puede ser anterior a la de inicio.');
    }

    const agenda = this.resolveAgenda(input, actual.plan.agenda);
    const tareas = this.resolveTasks(input, actual, actual.plan.tareas);
    const version = actual.plan.version + 1;

    return this.db.transaction(async (tx) => {
      const values = {
        fechaInicio,
        fechaFin,
        version,
        estado: 'borrador',
        elaboradoPorId: user.sub,
        enviadoEn: null,
        respondidoPorId: null,
        respondidoEn: null,
      };
      await tx
        .insert(planAuditoria)
        .values({ auditoriaId: id, ...values })
        .onConflictDoUpdate({ target: planAuditoria.auditoriaId, set: values });
      if (agenda.length > 0) {
        await tx.insert(agendaAuditoria).values(
          agenda.map((entry, index) => ({
            auditoriaId: id,
            planVersion: version,
            orden: index + 1,
            fecha: entry.fecha,
            actividad: entry.actividad,
          })),
        );
      }
      if (tareas.length > 0) {
        await tx.insert(tareaAuditoria).values(
          tareas.map((task, index) => ({
            auditoriaId: id,
            planVersion: version,
            auditorId: task.auditorId,
            orden: index + 1,
            descripcion: task.descripcion,
          })),
        );
      }
      if (fechaInicio !== null) {
        await tx.update(auditoria).set({ fechaPlan: fechaInicio }).where(eq(auditoria.id, id));
      }
      return this.recorder.record(id, user, tx);
    });
  }

  public async send(id: string, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asLeader(id, user);
    this.assertPlanning(actual);
    this.assertMove(actual.plan.estado, 'enviado', {
      sin_plan: 'Elabore y guarde el plan antes de enviarlo.',
      enviado: 'El plan ya fue enviado y espera la respuesta del área auditada.',
      con_propuesta: 'El área propuso otra fecha: ajuste y guarde el plan antes de volver a enviarlo.',
      aprobado: 'El plan ya fue aprobado por el área auditada.',
    });

    const gaps = PlanCompleteness.missing({
      fechaInicio: actual.plan.fechaInicio,
      fechaFin: actual.plan.fechaFin,
      agendaCount: actual.plan.agenda.length,
      tareasCount: actual.plan.tareas.length,
    });
    if (gaps.length > 0) {
      throw RuleViolation.fromGaps(gaps);
    }
    if (!actual.viabilidadOk) {
      throw RuleViolation.unprocessable('VIABILIDAD_PENDIENTE', 'Confirme la viabilidad de la auditoría antes de enviar el plan.');
    }

    return this.db.transaction(async (tx) => {
      await tx
        .update(planAuditoria)
        .set({ estado: 'enviado', enviadoEn: new Date(), respondidoPorId: null, respondidoEn: null })
        .where(eq(planAuditoria.auditoriaId, id));
      await tx
        .update(propuestaFechaPlan)
        .set({ estado: 'atendida' })
        .where(and(eq(propuestaFechaPlan.auditoriaId, id), eq(propuestaFechaPlan.estado, 'pendiente')));

      const detalle = await this.recorder.record(id, user, tx);
      const notice = { entidadTipo: 'auditoria', entidadId: id };
      await this.notifications.notifyUsers(
        await AuditRecipients.area(detalle, tx),
        {
          tipo: 'plan_enviado',
          titulo: 'Plan de auditoría por aprobar',
          mensaje: `El líder ${detalle.liderNombre} envió el plan de auditoría (${detalle.plan.fechaInicio} a ${detalle.plan.fechaFin}). Apruébelo o proponga otra fecha.`,
          ...notice,
        },
        tx,
      );
      await this.notifications.notifyUsers(
        AuditRecipients.team(detalle),
        {
          tipo: 'plan_disponible',
          titulo: 'Plan de auditoría disponible',
          mensaje: 'El plan de la auditoría se envió al área auditada. Ya puede consultarlo.',
          ...notice,
        },
        tx,
      );
      return detalle;
    });
  }

  public async propose(id: string, input: PlanPropuestaInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asAreaOwner(id, user);
    this.assertPlanning(actual);
    this.assertMove(actual.plan.estado, 'con_propuesta', {
      sin_plan: 'Todavía no hay un plan enviado para responder.',
      borrador: 'El líder aún no ha enviado el plan.',
      con_propuesta: 'Ya propuso otra fecha; espere la respuesta del líder.',
      aprobado: 'El plan ya fue aprobado.',
    });
    if (input.fecha_propuesta === undefined) {
      throw RuleViolation.unprocessable('PROPUESTA_SIN_FECHA', 'Indique la fecha que propone.');
    }
    if (input.fecha_propuesta < TodayClock.isoDate()) {
      throw RuleViolation.unprocessable('PROPUESTA_FECHA_PASADA', 'La fecha propuesta no puede ser anterior a hoy.');
    }
    const fecha = input.fecha_propuesta;

    return this.db.transaction(async (tx) => {
      await tx.insert(propuestaFechaPlan).values({
        auditoriaId: id,
        propuestaPorId: user.sub,
        fechaPropuesta: fecha,
        motivo: input.motivo_propuesta ?? null,
      });
      await tx
        .update(planAuditoria)
        .set({ estado: 'con_propuesta', respondidoPorId: user.sub, respondidoEn: new Date() })
        .where(eq(planAuditoria.auditoriaId, id));

      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyUsers(
        [detalle.liderId],
        {
          tipo: 'plan_propuesta_fecha',
          titulo: 'El área propone otra fecha',
          mensaje: `El área auditada propone realizar la auditoría el ${fecha}.${input.motivo_propuesta ? ` Motivo: ${input.motivo_propuesta}` : ''}`,
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }

  public async approve(id: string, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asAreaOwner(id, user);
    this.assertPlanning(actual);
    this.assertMove(actual.plan.estado, 'aprobado', {
      sin_plan: 'Todavía no hay un plan enviado para aprobar.',
      borrador: 'El líder aún no ha enviado el plan.',
      con_propuesta: 'Ya propuso otra fecha; espere el plan ajustado del líder.',
      aprobado: 'El plan ya fue aprobado.',
    });

    return this.db.transaction(async (tx) => {
      await tx
        .update(planAuditoria)
        .set({ estado: 'aprobado', respondidoPorId: user.sub, respondidoEn: new Date() })
        .where(eq(planAuditoria.auditoriaId, id));
      await tx.update(auditoria).set({ planAprobado: true }).where(eq(auditoria.id, id));

      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyUsers(
        [detalle.liderId, ...AuditRecipients.team(detalle)],
        {
          tipo: 'plan_aprobado',
          titulo: 'Plan de auditoría aprobado',
          mensaje: 'El área auditada aprobó el plan de la auditoría.',
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }

  private resolveAgenda(input: PlanInput, current: AgendaEntry[]): AgendaEntry[] {
    if (input.agenda === undefined) return current;
    return input.agenda === null ? [] : PlanTextParser.parseAgenda(input.agenda);
  }

  private resolveTasks(input: PlanInput, actual: AuditoriaDetalle, current: TaskEntry[]): TaskEntry[] {
    if (input.tareas === undefined) return current;
    if (input.tareas === null) return [];
    const parsed = PlanTextParser.parseTasks(input.tareas, actual.equipo);
    if (parsed.unknown.length > 0) {
      throw RuleViolation.unprocessable(
        'TAREAS_SIN_INTEGRANTE',
        actual.equipo.length === 0
          ? 'Asigne primero el equipo auditor para poder repartir tareas.'
          : `Estas tareas no corresponden a integrantes del equipo (use "Nombre: tarea"): ${parsed.unknown.join(', ')}.`,
        { desconocidos: parsed.unknown },
      );
    }
    return parsed.tasks;
  }

  private assertPlanning(actual: AuditoriaDetalle): void {
    if (!AuditStatusTransitions.isPlanning(actual.estado)) {
      throw RuleViolation.unprocessable(
        'AUDITORIA_NO_PLANIFICABLE',
        `La auditoría está ${AuditStatusTransitions.describe(actual.estado)}: el plan ya no se puede cambiar.`,
      );
    }
  }

  private assertMove(from: PlanStatus, to: PlanStatus, messages: Partial<Record<PlanStatus, string>>): void {
    if (!PlanStatusTransitions.canMove(from, to)) {
      throw RuleViolation.unprocessable(
        'PLAN_ESTADO_INVALIDO',
        messages[from] ?? `El plan está ${PlanStatusTransitions.describe(from)}: no se puede realizar esta acción.`,
      );
    }
  }
}

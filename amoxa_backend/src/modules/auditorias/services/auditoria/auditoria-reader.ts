import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import {
  agendaAuditoria,
  auditoria,
  auditoriaProceso,
  contactoAuditoria,
  equipoAuditoria,
  plantillaChecklist,
  planAuditoria,
  proceso,
  programaAuditoria,
  propuestaFechaPlan,
  revisionAlcance,
  tareaAuditoria,
  usuario,
} from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type { AuditoriaDetalle, AuditoriaResumen, PlanDetalle } from '@auditorias-types/auditoria-detalle.js';

export interface ListFilter {
  programaId?: string;
}

@Injectable()
export class AuditoriaReader {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async load(id: string, organizacionId: string, executor: DbExecutor = this.db): Promise<AuditoriaDetalle> {
    const [row] = await executor
      .select({
        auditoria,
        periodo: programaAuditoria.periodo,
        programaEstado: programaAuditoria.estado,
        organizacionId: programaAuditoria.organizacionId,
        plantilla: { id: plantillaChecklist.id, nombre: plantillaChecklist.nombre, vigente: plantillaChecklist.vigente },
        liderNombre: usuario.nombre,
      })
      .from(auditoria)
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(plantillaChecklist, eq(auditoria.plantillaId, plantillaChecklist.id))
      .innerJoin(usuario, eq(auditoria.liderId, usuario.id))
      .where(and(eq(auditoria.id, id), eq(programaAuditoria.organizacionId, organizacionId)))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException('Auditoría no encontrada');
    }

    const procesos = await executor
      .select({ id: proceso.id, nombre: proceso.nombre, duenoUsuarioId: proceso.duenoUsuarioId })
      .from(auditoriaProceso)
      .innerJoin(proceso, eq(auditoriaProceso.procesoId, proceso.id))
      .where(and(eq(auditoriaProceso.auditoriaId, id), isNull(auditoriaProceso.retiradoEn)))
      .orderBy(asc(proceso.nombre));

    const equipo = await executor
      .select({
        auditorId: equipoAuditoria.auditorId,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: equipoAuditoria.rol,
        procesoId: usuario.procesoId,
      })
      .from(equipoAuditoria)
      .innerJoin(usuario, eq(equipoAuditoria.auditorId, usuario.id))
      .where(and(eq(equipoAuditoria.auditoriaId, id), isNull(equipoAuditoria.retiradoEn)))
      .orderBy(asc(usuario.nombre));

    const [contacto] = await executor.select().from(contactoAuditoria).where(eq(contactoAuditoria.auditoriaId, id)).limit(1);
    const [revision] = await executor.select().from(revisionAlcance).where(eq(revisionAlcance.auditoriaId, id)).limit(1);
    const propuestas = await executor
      .select()
      .from(propuestaFechaPlan)
      .where(eq(propuestaFechaPlan.auditoriaId, id))
      .orderBy(desc(propuestaFechaPlan.creadaEn));

    return {
      id: row.auditoria.id,
      programaId: row.auditoria.programaId,
      organizacionId: row.organizacionId,
      periodo: row.periodo,
      programaEstado: row.programaEstado,
      plantilla: row.plantilla,
      liderId: row.auditoria.liderId,
      liderNombre: row.liderNombre,
      objetivos: row.auditoria.objetivos,
      criterios: row.auditoria.criterios ?? [],
      metodo: row.auditoria.metodo,
      fechaPlan: row.auditoria.fechaPlan,
      fechaReal: row.auditoria.fechaReal,
      viabilidadOk: row.auditoria.viabilidadOk,
      planAprobado: row.auditoria.planAprobado,
      estado: row.auditoria.estado,
      procesos,
      equipo,
      plan: await this.loadPlan(id, executor),
      contacto:
        contacto === undefined
          ? null
          : {
              informacionSuficiente: contacto.informacionSuficiente,
              cooperacion: contacto.cooperacion,
              tiempo: contacto.tiempo,
              observaciones: contacto.observaciones,
              confirmadoEn: contacto.confirmadoEn,
              respuestaArea: contacto.respuestaArea,
              respondidoEn: contacto.respondidoEn,
            },
      revision:
        revision === undefined
          ? null
          : { revisadoPorId: revision.revisadoPorId, revisadoEn: revision.revisadoEn, comentario: revision.comentario },
      propuestas: propuestas.map((propuesta) => ({
        id: propuesta.id,
        propuestaPorId: propuesta.propuestaPorId,
        fechaPropuesta: propuesta.fechaPropuesta,
        motivo: propuesta.motivo,
        estado: propuesta.estado,
        creadaEn: propuesta.creadaEn,
      })),
    };
  }

  public async loadPlan(auditoriaId: string, executor: DbExecutor = this.db): Promise<PlanDetalle> {
    const [plan] = await executor.select().from(planAuditoria).where(eq(planAuditoria.auditoriaId, auditoriaId)).limit(1);
    if (plan === undefined) {
      return {
        estado: 'sin_plan',
        version: 0,
        fechaInicio: null,
        fechaFin: null,
        agenda: [],
        tareas: [],
        enviadoEn: null,
        respondidoEn: null,
      };
    }
    const agenda = await executor
      .select({ fecha: agendaAuditoria.fecha, actividad: agendaAuditoria.actividad })
      .from(agendaAuditoria)
      .where(and(eq(agendaAuditoria.auditoriaId, auditoriaId), eq(agendaAuditoria.planVersion, plan.version)))
      .orderBy(asc(agendaAuditoria.orden));
    const tareas = await executor
      .select({ auditorId: tareaAuditoria.auditorId, descripcion: tareaAuditoria.descripcion })
      .from(tareaAuditoria)
      .where(and(eq(tareaAuditoria.auditoriaId, auditoriaId), eq(tareaAuditoria.planVersion, plan.version)))
      .orderBy(asc(tareaAuditoria.orden));
    return {
      estado: PlanStatusTransitions.parse(plan.estado),
      version: plan.version,
      fechaInicio: plan.fechaInicio,
      fechaFin: plan.fechaFin,
      agenda,
      tareas,
      enviadoEn: plan.enviadoEn,
      respondidoEn: plan.respondidoEn,
    };
  }

  public async list(
    user: TokenPayload,
    role: SessionRole,
    filter: ListFilter = {},
    executor: DbExecutor = this.db,
  ): Promise<AuditoriaResumen[]> {
    const scope = await this.scopeConditions(user, role, executor);
    if (scope === null) {
      return [];
    }
    const conditions = [eq(programaAuditoria.organizacionId, user.organizacionId), ...scope];
    if (filter.programaId !== undefined) {
      conditions.push(eq(auditoria.programaId, filter.programaId));
    }

    const rows = await executor
      .select({
        auditoria,
        periodo: programaAuditoria.periodo,
        plantilla: { id: plantillaChecklist.id, nombre: plantillaChecklist.nombre, vigente: plantillaChecklist.vigente },
        liderNombre: usuario.nombre,
      })
      .from(auditoria)
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(plantillaChecklist, eq(auditoria.plantillaId, plantillaChecklist.id))
      .innerJoin(usuario, eq(auditoria.liderId, usuario.id))
      .where(and(...conditions))
      .orderBy(desc(auditoria.fechaPlan), asc(auditoria.id));
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.auditoria.id);
    const procesos = await executor
      .select({ auditoriaId: auditoriaProceso.auditoriaId, id: proceso.id, nombre: proceso.nombre })
      .from(auditoriaProceso)
      .innerJoin(proceso, eq(auditoriaProceso.procesoId, proceso.id))
      .where(and(inArray(auditoriaProceso.auditoriaId, ids), isNull(auditoriaProceso.retiradoEn)))
      .orderBy(asc(proceso.nombre));
    const planes = await executor
      .select({ auditoriaId: planAuditoria.auditoriaId, estado: planAuditoria.estado })
      .from(planAuditoria)
      .where(inArray(planAuditoria.auditoriaId, ids));
    const planById = new Map(planes.map((plan) => [plan.auditoriaId, PlanStatusTransitions.parse(plan.estado)]));

    return rows.map((row) => ({
      id: row.auditoria.id,
      programaId: row.auditoria.programaId,
      periodo: row.periodo,
      estado: row.auditoria.estado,
      metodo: row.auditoria.metodo,
      fechaPlan: row.auditoria.fechaPlan,
      liderId: row.auditoria.liderId,
      liderNombre: row.liderNombre,
      plantilla: row.plantilla,
      procesos: procesos
        .filter((item) => item.auditoriaId === row.auditoria.id)
        .map((item) => ({ id: item.id, nombre: item.nombre })),
      viabilidadOk: row.auditoria.viabilidadOk,
      planAprobado: row.auditoria.planAprobado,
      planEstado: planById.get(row.auditoria.id) ?? 'sin_plan',
    }));
  }

  public async areaProcessIds(user: TokenPayload, executor: DbExecutor = this.db): Promise<string[]> {
    const owned = await executor
      .select({ id: proceso.id })
      .from(proceso)
      .where(and(eq(proceso.organizacionId, user.organizacionId), eq(proceso.duenoUsuarioId, user.sub)));
    const [self] = await executor.select({ procesoId: usuario.procesoId }).from(usuario).where(eq(usuario.id, user.sub)).limit(1);
    const ids = new Set(owned.map((row) => row.id));
    if (self?.procesoId !== undefined && self.procesoId !== null) {
      ids.add(self.procesoId);
    }
    return [...ids];
  }

  private async scopeConditions(user: TokenPayload, role: SessionRole, executor: DbExecutor) {
    if (RoleAccess.actsAs(role, 'gestor') || role === 'lider') {
      return [];
    }
    if (role === 'auditor') {
      const assigned = executor
        .select({ id: equipoAuditoria.auditoriaId })
        .from(equipoAuditoria)
        .where(and(eq(equipoAuditoria.auditorId, user.sub), isNull(equipoAuditoria.retiradoEn)));
      return [inArray(auditoria.id, assigned)];
    }
    if (role === 'dueno_proceso') {
      const areaIds = await this.areaProcessIds(user, executor);
      if (areaIds.length === 0) {
        return null;
      }
      const involved = executor
        .select({ id: auditoriaProceso.auditoriaId })
        .from(auditoriaProceso)
        .where(and(inArray(auditoriaProceso.procesoId, areaIds), isNull(auditoriaProceso.retiradoEn)));
      return [inArray(auditoria.id, involved)];
    }
    return null;
  }
}

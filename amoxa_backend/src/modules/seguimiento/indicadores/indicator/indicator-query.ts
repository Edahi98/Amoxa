import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { accion, auditoria, auditoriaProceso, hallazgo, programaAuditoria, proceso, usuario } from '@schemas/index.js';
import type {
  ActionStatusRow,
  AreaCountRow,
  AuditStatusRow,
  IndicatorFilters,
  IndicatorRaw,
  OverdueActionRow,
} from '@seguimiento-indicadores-indicator/indicator.types.js';

@Injectable()
export class IndicatorQuery {
  private static readonly OVERDUE_LIMIT = 200;

  constructor(@Inject(DB) private readonly db: Db) {}

  public async load(filters: IndicatorFilters, executor: DbExecutor = this.db): Promise<IndicatorRaw> {
    const hoy = filters.hoy ?? new Date().toISOString().slice(0, 10);
    const [auditoriasPorEstado, incumplimientosPorArea, accionesPorArea, accionesPorEstado, accionesAtrasadas] = await Promise.all([
      this.auditsByStatus(filters, executor),
      this.nonConformitiesByArea(filters, executor),
      this.actionsByArea(filters, hoy, executor),
      this.actionsByStatus(filters, executor),
      this.overdueActions(filters, hoy, executor),
    ]);
    return { auditoriasPorEstado, incumplimientosPorArea, accionesPorArea, accionesPorEstado, accionesAtrasadas };
  }

  private static overdue(hoy: string): SQL {
    return sql`(${accion.estado} <> 'completada' and (${accion.estado} = 'vencida' or ${accion.fechaLimite} < ${hoy}::date))`;
  }

  private static programConditions(filters: IndicatorFilters): SQL[] {
    const conditions: SQL[] = [eq(programaAuditoria.organizacionId, filters.organizacionId)];
    if (filters.periodo !== undefined) {
      conditions.push(eq(programaAuditoria.periodo, filters.periodo));
    }
    if (filters.programaId !== undefined) {
      conditions.push(eq(programaAuditoria.id, filters.programaId));
    }
    return conditions;
  }

  private async auditsByStatus(filters: IndicatorFilters, executor: DbExecutor): Promise<AuditStatusRow[]> {
    const conditions = IndicatorQuery.programConditions(filters);
    if (filters.area !== undefined) {
      conditions.push(
        inArray(
          auditoria.id,
          executor.select({ id: auditoriaProceso.auditoriaId }).from(auditoriaProceso).where(and(eq(auditoriaProceso.procesoId, filters.area), isNull(auditoriaProceso.retiradoEn))),
        ),
      );
    }
    return executor
      .select({ estado: auditoria.estado, total: count() })
      .from(auditoria)
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(and(...conditions))
      .groupBy(auditoria.estado);
  }

  private async nonConformitiesByArea(filters: IndicatorFilters, executor: DbExecutor): Promise<AreaCountRow[]> {
    const conditions = IndicatorQuery.programConditions(filters);
    conditions.push(eq(hallazgo.tipo, 'NC'));
    if (filters.area !== undefined) {
      conditions.push(eq(hallazgo.procesoId, filters.area));
    }
    return executor
      .select({
        procesoId: hallazgo.procesoId,
        area: proceso.nombre,
        total: count(),
        pendientes: sql<number>`count(*) filter (where ${hallazgo.estado} <> 'cerrado')`.mapWith(Number),
      })
      .from(hallazgo)
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
      .where(and(...conditions))
      .groupBy(hallazgo.procesoId, proceso.nombre);
  }

  private async actionsByArea(filters: IndicatorFilters, hoy: string, executor: DbExecutor): Promise<AreaCountRow[]> {
    const conditions = IndicatorQuery.programConditions(filters);
    if (filters.area !== undefined) {
      conditions.push(eq(hallazgo.procesoId, filters.area));
    }
    return executor
      .select({
        procesoId: hallazgo.procesoId,
        area: proceso.nombre,
        total: count(),
        pendientes: sql<number>`count(*) filter (where ${IndicatorQuery.overdue(hoy)})`.mapWith(Number),
      })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
      .where(and(...conditions))
      .groupBy(hallazgo.procesoId, proceso.nombre);
  }

  private async actionsByStatus(filters: IndicatorFilters, executor: DbExecutor): Promise<ActionStatusRow[]> {
    const conditions = IndicatorQuery.programConditions(filters);
    if (filters.area !== undefined) {
      conditions.push(eq(hallazgo.procesoId, filters.area));
    }
    return executor
      .select({ estado: accion.estado, total: count() })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(and(...conditions))
      .groupBy(accion.estado);
  }

  private async overdueActions(filters: IndicatorFilters, hoy: string, executor: DbExecutor): Promise<OverdueActionRow[]> {
    const conditions = IndicatorQuery.programConditions(filters);
    conditions.push(IndicatorQuery.overdue(hoy));
    if (filters.area !== undefined) {
      conditions.push(eq(hallazgo.procesoId, filters.area));
    }
    return executor
      .select({
        id: accion.id,
        descripcion: accion.descripcion,
        fechaLimite: accion.fechaLimite,
        estado: accion.estado,
        area: proceso.nombre,
        responsable: usuario.nombre,
      })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
      .innerJoin(usuario, eq(accion.responsableId, usuario.id))
      .where(and(...conditions))
      .orderBy(asc(accion.fechaLimite))
      .limit(IndicatorQuery.OVERDUE_LIMIT);
  }
}

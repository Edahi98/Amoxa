import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, ne } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { auditoria, hallazgo, proceso, programaAuditoria, programaProceso, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import { PriorityScorer, type RankedProcess } from '@programas-rules/priority-scorer.js';
import { ProgramaStatus } from '@programas-rules-programa/programa-status.js';
import type { ProgramaDetail, ProgramaProcesoDetail, ProgramaRow } from '@programas-mappers-programa/programa-view.js';
import type { CalendarAuditInput } from '@programas-rules-programa/programa-calendar.js';

@Injectable()
export class ProgramaQueryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async list(organizacionId: string, role: SessionRole, executor: DbExecutor = this.db): Promise<ProgramaRow[]> {
    const rows = await executor
      .select()
      .from(programaAuditoria)
      .where(eq(programaAuditoria.organizacionId, organizacionId))
      .orderBy(desc(programaAuditoria.periodo));
    return role === 'direccion' ? rows.filter((row) => ProgramaStatus.visibleToDireccion(row.estado)) : rows;
  }

  public async find(id: string, organizacionId: string, role: SessionRole, executor: DbExecutor = this.db): Promise<ProgramaRow> {
    const [row] = await executor
      .select()
      .from(programaAuditoria)
      .where(and(eq(programaAuditoria.id, id), eq(programaAuditoria.organizacionId, organizacionId)))
      .limit(1);
    if (row === undefined || (role === 'direccion' && !ProgramaStatus.visibleToDireccion(row.estado))) {
      throw new NotFoundException('Programa no encontrado');
    }
    return row;
  }

  public async latestPending(organizacionId: string, executor: DbExecutor = this.db): Promise<ProgramaRow | undefined> {
    const [row] = await executor
      .select()
      .from(programaAuditoria)
      .where(and(eq(programaAuditoria.organizacionId, organizacionId), eq(programaAuditoria.estado, 'pendiente_aprobacion')))
      .orderBy(desc(programaAuditoria.enviadoEn))
      .limit(1);
    return row;
  }

  public async detailOf(row: ProgramaRow, executor: DbExecutor = this.db): Promise<ProgramaDetail> {
    const procesos = await this.processes(row.id, executor);
    return {
      row,
      procesos,
      creadoPor: await this.userName(row.creadoPorId, executor),
      aprobadoPor: await this.userName(row.aprobadoPorId, executor),
    };
  }

  public async detail(id: string, organizacionId: string, role: SessionRole, executor: DbExecutor = this.db): Promise<ProgramaDetail> {
    return this.detailOf(await this.find(id, organizacionId, role, executor), executor);
  }

  public async processes(programaId: string, executor: DbExecutor = this.db): Promise<ProgramaProcesoDetail[]> {
    return executor
      .select({
        procesoId: programaProceso.procesoId,
        nombre: proceso.nombre,
        importancia: proceso.importancia,
        orden: programaProceso.orden,
        puntajeSugerido: programaProceso.puntajeSugerido,
      })
      .from(programaProceso)
      .innerJoin(proceso, eq(proceso.id, programaProceso.procesoId))
      .where(and(eq(programaProceso.programaId, programaId), isNull(programaProceso.retiradoEn)))
      .orderBy(asc(programaProceso.orden));
  }

  public async ranking(organizacionId: string, executor: DbExecutor = this.db): Promise<RankedProcess[]> {
    const processes = await executor.select().from(proceso).where(eq(proceso.organizacionId, organizacionId));
    const previous = await executor
      .select({ procesoId: hallazgo.procesoId, total: count() })
      .from(hallazgo)
      .innerJoin(proceso, eq(proceso.id, hallazgo.procesoId))
      .where(and(eq(proceso.organizacionId, organizacionId), eq(hallazgo.tipo, 'NC')))
      .groupBy(hallazgo.procesoId);
    const totals = new Map(previous.map((entry) => [entry.procesoId, Number(entry.total)]));
    return PriorityScorer.rank(
      processes.map((entry) => ({
        id: entry.id,
        nombre: entry.nombre,
        importancia: entry.importancia,
        nivelRiesgo: entry.nivelRiesgo,
        cambiosRecientes: entry.cambiosRecientes,
        incumplimientosPrevios: totals.get(entry.id) ?? 0,
      })),
    );
  }

  public async audits(programaId: string, executor: DbExecutor = this.db): Promise<CalendarAuditInput[]> {
    return executor
      .select({
        id: auditoria.id,
        fechaPlan: auditoria.fechaPlan,
        estado: auditoria.estado,
        objetivos: auditoria.objetivos,
      })
      .from(auditoria)
      .where(and(eq(auditoria.programaId, programaId), ne(auditoria.estado, 'cancelada')))
      .orderBy(asc(auditoria.fechaPlan));
  }

  public async periodTaken(
    organizacionId: string,
    periodo: string,
    exceptId: string | undefined,
    executor: DbExecutor = this.db,
  ): Promise<boolean> {
    const rows = await executor
      .select({ id: programaAuditoria.id, periodo: programaAuditoria.periodo })
      .from(programaAuditoria)
      .where(eq(programaAuditoria.organizacionId, organizacionId));
    const wanted = periodo.trim().toLowerCase();
    return rows.some((row) => row.id !== exceptId && row.periodo.trim().toLowerCase() === wanted);
  }

  private async userName(id: string | null, executor: DbExecutor): Promise<string | null> {
    if (id === null) {
      return null;
    }
    const [row] = await executor.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, id)).limit(1);
    return row?.nombre ?? null;
  }
}

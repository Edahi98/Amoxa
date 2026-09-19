import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { auditor, evaluacionAuditor, evaluacionCompetencia, usuario } from '@schemas/index.js';
import type { AuditorRecord, EvaluacionRecord } from '@auditores-mappers-auditor/auditor-view.js';

@Injectable()
export class AuditorQueryService {
  public static readonly AUDITOR_ROLES = ['auditor', 'lider_auditor'] as const;

  constructor(@Inject(DB) private readonly db: Db) {}

  public async list(organizacionId: string, executor: DbExecutor = this.db): Promise<AuditorRecord[]> {
    return this.select(executor)
      .where(and(eq(usuario.organizacionId, organizacionId), inArray(usuario.rol, [...AuditorQueryService.AUDITOR_ROLES])))
      .orderBy(asc(usuario.nombre));
  }

  public async find(id: string, organizacionId: string, executor: DbExecutor = this.db): Promise<AuditorRecord> {
    const [record] = await this.select(executor)
      .where(
        and(
          eq(usuario.id, id),
          eq(usuario.organizacionId, organizacionId),
          inArray(usuario.rol, [...AuditorQueryService.AUDITOR_ROLES]),
        ),
      )
      .limit(1);
    if (record === undefined) {
      throw new NotFoundException('Auditor no encontrado');
    }
    return record;
  }

  public async evaluations(auditorId: string, executor: DbExecutor = this.db): Promise<EvaluacionRecord[]> {
    const rows = await executor
      .select({
        id: evaluacionAuditor.id,
        auditorId: evaluacionAuditor.auditorId,
        fecha: evaluacionAuditor.fecha,
        resultado: evaluacionAuditor.resultado,
        observaciones: evaluacionAuditor.observaciones,
        estadoResultante: evaluacionAuditor.estadoResultante,
        vigenciaHasta: evaluacionAuditor.vigenciaHasta,
        evaluador: usuario.nombre,
      })
      .from(evaluacionAuditor)
      .innerJoin(usuario, eq(usuario.id, evaluacionAuditor.evaluadorId))
      .where(eq(evaluacionAuditor.auditorId, auditorId))
      .orderBy(desc(evaluacionAuditor.fecha), desc(evaluacionAuditor.creadaEn));
    if (rows.length === 0) {
      return [];
    }
    const methods = await executor
      .select({ evaluacionId: evaluacionCompetencia.evaluacionId, metodo: evaluacionCompetencia.metodo })
      .from(evaluacionCompetencia)
      .where(inArray(evaluacionCompetencia.evaluacionId, rows.map((row) => row.id)));
    return rows.map((row) => ({
      ...row,
      metodos: methods.filter((entry) => entry.evaluacionId === row.id).map((entry) => entry.metodo),
    }));
  }

  public async evaluation(
    auditorId: string,
    evaluacionId: string,
    executor: DbExecutor = this.db,
  ): Promise<EvaluacionRecord> {
    const found = (await this.evaluations(auditorId, executor)).find((entry) => entry.id === evaluacionId);
    if (found === undefined) {
      throw new NotFoundException('Evaluación no encontrada');
    }
    return found;
  }

  private select(executor: DbExecutor) {
    return executor
      .select({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        disciplinas: auditor.disciplinas,
        formacion: auditor.formacion,
        experiencia: auditor.experiencia,
        estado: auditor.estado,
        vigenciaHasta: auditor.vigenciaHasta,
      })
      .from(usuario)
      .leftJoin(auditor, eq(auditor.usuarioId, usuario.id));
  }
}

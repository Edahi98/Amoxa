import { and, eq, inArray } from 'drizzle-orm';
import type { DbExecutor } from '@db/db-executor.js';
import { auditor, usuario } from '@schemas/index.js';
import type { TeamCandidate } from '@auditorias-rules/team-eligibility.js';

export class TeamCandidateLoader {
  public static async byIds(
    ids: readonly string[],
    organizacionId: string,
    executor: DbExecutor,
  ): Promise<Map<string, TeamCandidate>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await TeamCandidateLoader.query(executor, organizacionId, [inArray(auditor.usuarioId, [...ids])]);
    return new Map(rows.map((row) => [row.usuarioId, row]));
  }

  public static async all(organizacionId: string, executor: DbExecutor): Promise<TeamCandidate[]> {
    return TeamCandidateLoader.query(executor, organizacionId, []);
  }

  private static async query(
    executor: DbExecutor,
    organizacionId: string,
    extra: ReturnType<typeof inArray>[],
  ): Promise<TeamCandidate[]> {
    const rows = await executor
      .select({
        usuarioId: auditor.usuarioId,
        nombre: usuario.nombre,
        procesoId: usuario.procesoId,
        estado: auditor.estado,
        vigenciaHasta: auditor.vigenciaHasta,
      })
      .from(auditor)
      .innerJoin(usuario, eq(auditor.usuarioId, usuario.id))
      .where(and(eq(usuario.organizacionId, organizacionId), ...extra))
      .orderBy(usuario.nombre);
    return rows;
  }
}

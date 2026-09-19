import { and, eq, inArray } from 'drizzle-orm';
import type { DbExecutor } from '@db/db-executor.js';
import { usuario } from '@schemas/index.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';

export class AuditRecipients {
  public static async area(detalle: AuditoriaDetalle, executor: DbExecutor): Promise<string[]> {
    const ids = new Set(detalle.procesos.map((item) => item.duenoUsuarioId));
    const processIds = detalle.procesos.map((item) => item.id);
    if (processIds.length > 0) {
      const members = await executor
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(eq(usuario.organizacionId, detalle.organizacionId), inArray(usuario.procesoId, processIds), eq(usuario.rol, 'auditado')));
      members.forEach((member) => ids.add(member.id));
    }
    return [...ids];
  }

  public static team(detalle: AuditoriaDetalle): string[] {
    return detalle.equipo.map((member) => member.auditorId);
  }
}

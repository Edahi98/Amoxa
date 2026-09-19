import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, inArray, isNull, lte, notInArray, type SQL } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { accion, auditoria, hallazgo, notificacion } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AuditVisibility } from '@registros-consulta/audit-visibility.js';

export interface HomeCounts {
  notificaciones_sin_leer: number;
  acciones_por_vencer: number;
  auditorias_en_curso: number;
}

@Injectable()
export class HomeCountsQuery {
  public static readonly WINDOW_DAYS = 7;

  constructor(@Inject(DB) private readonly db: Db) {}

  public static addDays(day: string, days: number): string {
    const date = new Date(`${day}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  public async load(user: TokenPayload, role: SessionRole, hoy: string = new Date().toISOString().slice(0, 10)): Promise<HomeCounts> {
    const audits = AuditVisibility.auditIds(this.db, user, role);
    const dueConditions: SQL[] = [
      inArray(hallazgo.auditoriaId, audits),
      notInArray(accion.estado, ['completada', 'vencida']),
      gte(accion.fechaLimite, hoy),
      lte(accion.fechaLimite, HomeCountsQuery.addDays(hoy, HomeCountsQuery.WINDOW_DAYS)),
    ];
    if (role === 'dueno_proceso') {
      dueConditions.push(inArray(hallazgo.procesoId, AuditVisibility.ownProcess(this.db, user)));
    }

    const [[unread], [dueSoon], [running]] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(notificacion)
        .where(and(eq(notificacion.usuarioId, user.sub), isNull(notificacion.leidaEn))),
      this.db
        .select({ total: count() })
        .from(accion)
        .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
        .where(and(...dueConditions)),
      this.db
        .select({ total: count() })
        .from(auditoria)
        .where(and(eq(auditoria.estado, 'en_curso'), inArray(auditoria.id, audits))),
    ]);
    return {
      notificaciones_sin_leer: unread?.total ?? 0,
      acciones_por_vencer: dueSoon?.total ?? 0,
      auditorias_en_curso: running?.total ?? 0,
    };
  }
}

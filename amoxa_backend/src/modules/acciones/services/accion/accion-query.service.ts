import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { accion, auditoria, hallazgo, programaAuditoria } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AccionAccess } from '@acciones-rules-accion/accion-access.js';
import type { AccionDetalle } from '@acciones-rules-accion/accion-detalle.types.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';

export interface AccionResumen {
  id: string;
  hallazgoId: string;
  descripcion: string;
  responsableId: string;
  responsable: string;
  proceso: string;
  fechaLimite: string | null;
  diasRestantes: number | null;
  estado: string;
}

export interface AccionFiltros {
  estado?: string;
  hallazgoId?: string;
}

@Injectable()
export class AccionQueryService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: AccionLoaderService,
  ) {}

  async list(user: TokenPayload, role: SessionRole, filtros: AccionFiltros = {}, now: Date = new Date()): Promise<AccionResumen[]> {
    const rows = await this.db
      .select({ id: accion.id })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(
        and(
          eq(programaAuditoria.organizacionId, user.organizacionId),
          role === 'dueno_proceso' ? eq(accion.responsableId, user.sub) : undefined,
          filtros.hallazgoId === undefined ? undefined : eq(accion.hallazgoId, filtros.hallazgoId),
        ),
      )
      .orderBy(desc(accion.fechaLimite), desc(accion.id));

    const result: AccionResumen[] = [];
    for (const row of rows) {
      const detail = await this.loader.detail(row.id, user.organizacionId, now);
      if (!AccionAccess.canRead(detail, role, user.sub)) {
        continue;
      }
      if (filtros.estado !== undefined && detail.estado !== filtros.estado) {
        continue;
      }
      result.push({
        id: detail.id,
        hallazgoId: detail.hallazgo.id,
        descripcion: detail.descripcion,
        responsableId: detail.responsableId,
        responsable: detail.responsableNombre,
        proceso: detail.hallazgo.proceso,
        fechaLimite: detail.fechaLimite,
        diasRestantes: detail.diasRestantes,
        estado: detail.estado,
      });
    }
    return result;
  }

  async get(accionId: string, user: TokenPayload, role: SessionRole, now: Date = new Date()): Promise<AccionDetalle> {
    const detail = await this.loader.detail(accionId, user.organizacionId, now);
    if (!AccionAccess.canRead(detail, role, user.sub)) {
      throw new ForbiddenException('No tiene acceso a esta acción.');
    }
    return detail;
  }
}

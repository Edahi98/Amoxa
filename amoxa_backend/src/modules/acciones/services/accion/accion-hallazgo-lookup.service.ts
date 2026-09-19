import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { accion, auditoria, hallazgo, proceso, programaAuditoria, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';

export interface HallazgoParaAccion {
  id: string;
  proceso: string;
  clasificacion: 'menor' | 'mayor' | null;
  criterio: string | null;
  descripcion: string;
  estado: 'abierto' | 'en_verificacion' | 'cerrado';
  accionDescripcion: string | null;
  accionFechaLimite: string | null;
}

export interface ResponsableOpcion {
  id: string;
  nombre: string;
  rol: string;
}

@Injectable()
export class AccionHallazgoLookupService {
  private static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(@Inject(DB) private readonly db: Db) {}

  async find(entityId: string | undefined, user: TokenPayload): Promise<HallazgoParaAccion | undefined> {
    const filters = [eq(programaAuditoria.organizacionId, user.organizacionId), eq(hallazgo.tipo, 'NC')];
    if (entityId !== undefined) {
      if (!AccionHallazgoLookupService.UUID.test(entityId)) {
        return undefined;
      }
      filters.push(eq(hallazgo.id, entityId));
    } else {
      const [self] = await this.db.select({ procesoId: usuario.procesoId }).from(usuario).where(eq(usuario.id, user.sub));
      const owned = await this.db.select({ id: proceso.id }).from(proceso).where(eq(proceso.duenoUsuarioId, user.sub));
      const processIds = [...owned.map((row) => row.id), ...(self?.procesoId ? [self.procesoId] : [])];
      if (processIds.length === 0) {
        return undefined;
      }
      filters.push(inArray(hallazgo.procesoId, processIds), eq(hallazgo.estado, 'abierto'));
    }

    const rows = await this.db
      .select({
        id: hallazgo.id,
        proceso: proceso.nombre,
        clasificacion: hallazgo.clasificacion,
        criterio: hallazgo.criterioIncumplido,
        descripcion: hallazgo.descripcion,
        estado: hallazgo.estado,
        accionDescripcion: accion.descripcion,
        accionFechaLimite: accion.fechaLimite,
      })
      .from(hallazgo)
      .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .leftJoin(accion, eq(accion.hallazgoId, hallazgo.id))
      .where(and(...filters))
      .orderBy(asc(hallazgo.id));
    if (entityId !== undefined) {
      return rows[0];
    }
    return rows.find((row) => row.accionDescripcion === null);
  }

  async responsables(organizacionId: string): Promise<ResponsableOpcion[]> {
    return this.db
      .select({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol })
      .from(usuario)
      .where(and(eq(usuario.organizacionId, organizacionId), inArray(usuario.rol, ['auditado', 'auditor'])))
      .orderBy(asc(usuario.nombre));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { organizacion, plantillaChecklist, programaAuditoria, proceso, usuario } from '@schemas/index.js';
import type { AuditoriaContext } from '@ejecucion-acceso-auditoria/auditoria-context.js';

export interface AuditoriaResumen {
  id: string;
  titulo: string;
  organizacion: string;
  lider: string;
  metodo: string;
  metodoClave: string;
  fechaPlan: string | null;
  fechaReal: string | null;
  estado: string;
  plantilla: string;
  procesos: { id: string; nombre: string }[];
}

@Injectable()
export class AuditoriaResumenService {
  private static readonly METHODS: Readonly<Record<string, string>> = {
    in_situ: 'In situ',
    remoto: 'Remoto',
    mixto: 'Mixto',
  };

  constructor(@Inject(DB) private readonly db: Db) {}

  public async namesOf(ids: readonly string[], executor: DbExecutor = this.db): Promise<{ id: string; nombre: string }[]> {
    if (ids.length === 0) {
      return [];
    }
    return executor
      .select({ id: usuario.id, nombre: usuario.nombre })
      .from(usuario)
      .where(inArray(usuario.id, [...ids]));
  }

  public async of(context: AuditoriaContext, executor: DbExecutor = this.db): Promise<AuditoriaResumen> {
    const audit = context.auditoria;
    const [org] = await executor
      .select({ nombre: organizacion.nombre })
      .from(organizacion)
      .where(eq(organizacion.id, context.organizacionId));
    const [program] = await executor
      .select({ periodo: programaAuditoria.periodo })
      .from(programaAuditoria)
      .where(eq(programaAuditoria.id, audit.programaId));
    const [leader] = await executor.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, audit.liderId));
    const [template] = await executor
      .select({ nombre: plantillaChecklist.nombre })
      .from(plantillaChecklist)
      .where(eq(plantillaChecklist.id, audit.plantillaId));
    const processes =
      context.procesoIds.length === 0
        ? []
        : await executor
            .select({ id: proceso.id, nombre: proceso.nombre })
            .from(proceso)
            .where(inArray(proceso.id, context.procesoIds))
            .orderBy(asc(proceso.nombre));
    const names = processes.map((item) => item.nombre);
    return {
      id: audit.id,
      titulo: `Auditoría ${program?.periodo ?? ''}${names.length === 0 ? '' : ` · ${names.join(', ')}`}`.trim(),
      organizacion: org?.nombre ?? 'Organización',
      lider: leader?.nombre ?? 'Sin líder',
      metodo: AuditoriaResumenService.METHODS[audit.metodo] ?? audit.metodo,
      metodoClave: audit.metodo,
      fechaPlan: audit.fechaPlan,
      fechaReal: audit.fechaReal,
      estado: audit.estado,
      plantilla: template?.nombre ?? 'Sin plantilla',
      procesos: processes,
    };
  }
}

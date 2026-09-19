import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import {
  accion,
  accionEvidencia,
  accionReporteCierre,
  accionVerificacion,
  auditoria,
  hallazgo,
  organizacion,
  programaAuditoria,
  proceso,
  usuario,
} from '@schemas/index.js';
import type { AccionDetalle } from '@acciones-rules-accion/accion-detalle.types.js';
import { ActionState } from '@acciones-rules-action/action-state.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';

@Injectable()
export class AccionLoaderService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async detail(accionId: string, organizacionId: string, now: Date = new Date(), executor: DbExecutor = this.db): Promise<AccionDetalle> {
    const [base] = await executor
      .select({
        accion,
        hallazgo,
        proceso: proceso.nombre,
        organizacionId: programaAuditoria.organizacionId,
        organizacionNombre: organizacion.nombre,
      })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
      .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(organizacion, eq(programaAuditoria.organizacionId, organizacion.id))
      .where(and(eq(accion.id, accionId), eq(programaAuditoria.organizacionId, organizacionId)));
    if (base === undefined) {
      throw new NotFoundException('Acción no encontrada');
    }

    const [responsable] = await executor.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, base.accion.responsableId));
    const evidencias = await executor
      .select({
        id: accionEvidencia.id,
        etapa: accionEvidencia.etapa,
        ciclo: accionEvidencia.ciclo,
        nombre: accionEvidencia.nombre,
        url: accionEvidencia.url,
        tipo: accionEvidencia.tipo,
        hash: accionEvidencia.hash,
      })
      .from(accionEvidencia)
      .where(eq(accionEvidencia.accionId, accionId))
      .orderBy(asc(accionEvidencia.creadaEn));
    const verificaciones = await executor
      .select({
        ciclo: accionVerificacion.ciclo,
        verificadorNombre: usuario.nombre,
        eficaz: accionVerificacion.eficaz,
        comentario: accionVerificacion.comentario,
        nuevaFecha: accionVerificacion.nuevaFecha,
        verificadoEn: accionVerificacion.verificadoEn,
      })
      .from(accionVerificacion)
      .innerJoin(usuario, eq(accionVerificacion.verificadorId, usuario.id))
      .where(eq(accionVerificacion.accionId, accionId))
      .orderBy(asc(accionVerificacion.verificadoEn));
    const [lastReport] = await executor
      .select({ comentario: accionReporteCierre.comentario })
      .from(accionReporteCierre)
      .where(eq(accionReporteCierre.accionId, accionId))
      .orderBy(desc(accionReporteCierre.reportadoEn))
      .limit(1);

    const reaperturas = verificaciones.filter((item) => !item.eficaz).length;
    const estado = ActionState.resolve({
      estado: base.accion.estado,
      fechaCierre: base.accion.fechaCierre,
      verificacionEficacia: base.accion.verificacionEficacia,
      reaperturas,
    });

    return {
      id: base.accion.id,
      organizacionId: base.organizacionId,
      organizacionNombre: base.organizacionNombre,
      hallazgo: {
        id: base.hallazgo.id,
        auditoriaId: base.hallazgo.auditoriaId,
        procesoId: base.hallazgo.procesoId,
        proceso: base.proceso,
        tipo: base.hallazgo.tipo,
        clasificacion: base.hallazgo.clasificacion,
        criterio: base.hallazgo.criterioIncumplido,
        descripcion: base.hallazgo.descripcion,
        estado: base.hallazgo.estado,
      },
      responsableId: base.accion.responsableId,
      responsableNombre: responsable?.nombre ?? '',
      descripcion: base.accion.descripcion,
      causaRaiz: base.accion.causaRaiz,
      fechaLimite: base.accion.fechaLimite,
      fechaCierre: base.accion.fechaCierre,
      estadoDb: base.accion.estado,
      verificacionEficacia: base.accion.verificacionEficacia,
      estado,
      reaperturas,
      ciclo: reaperturas + 1,
      diasRestantes: DeadlineCalculator.daysLeft(base.accion.fechaLimite, now),
      comentarioCierre: lastReport?.comentario ?? null,
      evidencias,
      verificaciones: verificaciones.map((item) => ({
        ciclo: item.ciclo,
        verificadorNombre: item.verificadorNombre,
        eficaz: item.eficaz,
        comentario: item.comentario,
        nuevaFecha: item.nuevaFecha,
        verificadoEn: item.verificadoEn.toISOString(),
      })),
    };
  }
}

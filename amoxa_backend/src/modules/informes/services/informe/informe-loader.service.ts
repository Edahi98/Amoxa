import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import {
  accion,
  auditoria,
  auditoriaProceso,
  distribucionInforme,
  equipoAuditoria,
  hallazgo,
  informe,
  informeAcuse,
  informeFirma,
  organizacion,
  programaAuditoria,
  proceso,
  usuario,
} from '@schemas/index.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';
import { InformeFingerprint } from '@informes-rules-informe/informe-fingerprint.js';
import { InformeState } from '@informes-rules-informe/informe-state.js';
import type { HallazgoResumen, InformeEstado } from '@informes-rules-informe/informe.types.js';

@Injectable()
export class InformeLoaderService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async estadoOf(informeId: string, executor: DbExecutor = this.db): Promise<InformeEstado> {
    const [firma] = await executor.select({ id: informeFirma.informeId }).from(informeFirma).where(eq(informeFirma.informeId, informeId));
    const [envio] = await executor
      .select({ id: distribucionInforme.informeId })
      .from(distribucionInforme)
      .where(eq(distribucionInforme.informeId, informeId))
      .limit(1);
    return InformeState.resolve(firma !== undefined, envio !== undefined);
  }

  async findIdByAuditoria(auditoriaId: string, organizacionId: string, executor: DbExecutor = this.db): Promise<string | undefined> {
    const [row] = await executor
      .select({ id: informe.id })
      .from(informe)
      .innerJoin(auditoria, eq(informe.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(and(eq(informe.auditoriaId, auditoriaId), eq(programaAuditoria.organizacionId, organizacionId)));
    return row?.id;
  }

  async assertOwned(informeId: string, organizacionId: string, executor: DbExecutor = this.db): Promise<void> {
    const [row] = await executor
      .select({ id: informe.id })
      .from(informe)
      .innerJoin(auditoria, eq(informe.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .where(and(eq(informe.id, informeId), eq(programaAuditoria.organizacionId, organizacionId)));
    if (row === undefined) {
      throw new NotFoundException('Informe no encontrado');
    }
  }

  async hallazgosOf(auditoriaId: string, executor: DbExecutor = this.db): Promise<HallazgoResumen[]> {
    const rows = await executor
      .select({
        id: hallazgo.id,
        tipo: hallazgo.tipo,
        clasificacion: hallazgo.clasificacion,
        criterio: hallazgo.criterioIncumplido,
        descripcion: hallazgo.descripcion,
        estado: hallazgo.estado,
        proceso: proceso.nombre,
      })
      .from(hallazgo)
      .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
      .where(eq(hallazgo.auditoriaId, auditoriaId))
      .orderBy(asc(proceso.nombre), asc(hallazgo.id));
    const weight = (item: HallazgoResumen): number => {
      if (item.tipo === 'NC') {
        return item.clasificacion === 'mayor' ? 0 : 1;
      }
      return item.tipo === 'OM' ? 2 : 3;
    };
    return rows.sort((a, b) => weight(a) - weight(b));
  }

  async detail(informeId: string, organizacionId: string, executor: DbExecutor = this.db): Promise<InformeDetalle> {
    const [base] = await executor
      .select({
        informe,
        auditoria,
        organizacionId: programaAuditoria.organizacionId,
        periodo: programaAuditoria.periodo,
        organizacionNombre: organizacion.nombre,
      })
      .from(informe)
      .innerJoin(auditoria, eq(informe.auditoriaId, auditoria.id))
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
      .innerJoin(organizacion, eq(programaAuditoria.organizacionId, organizacion.id))
      .where(and(eq(informe.id, informeId), eq(programaAuditoria.organizacionId, organizacionId)));
    if (base === undefined) {
      throw new NotFoundException('Informe no encontrado');
    }

    const auditoriaId = base.auditoria.id;
    const [lider] = await executor.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, base.auditoria.liderId));
    const procesos = await executor
      .select({ id: proceso.id, nombre: proceso.nombre })
      .from(auditoriaProceso)
      .innerJoin(proceso, eq(auditoriaProceso.procesoId, proceso.id))
      .where(and(eq(auditoriaProceso.auditoriaId, auditoriaId), isNull(auditoriaProceso.retiradoEn)))
      .orderBy(asc(proceso.nombre));
    const equipo = await executor
      .select({ nombre: usuario.nombre, rol: equipoAuditoria.rol })
      .from(equipoAuditoria)
      .innerJoin(usuario, eq(equipoAuditoria.auditorId, usuario.id))
      .where(and(eq(equipoAuditoria.auditoriaId, auditoriaId), isNull(equipoAuditoria.retiradoEn)))
      .orderBy(asc(equipoAuditoria.rol), asc(usuario.nombre));
    const hallazgos = await this.hallazgosOf(auditoriaId, executor);

    const [firma] = await executor
      .select({
        firmanteId: informeFirma.firmanteId,
        firmanteNombre: usuario.nombre,
        firmadoEn: informeFirma.firmadoEn,
        huella: informeFirma.huella,
      })
      .from(informeFirma)
      .innerJoin(usuario, eq(informeFirma.firmanteId, usuario.id))
      .where(eq(informeFirma.informeId, informeId));

    const distribucion = await executor
      .select({
        usuarioId: distribucionInforme.usuarioId,
        nombre: usuario.nombre,
        rol: usuario.rol,
        fechaEnvio: distribucionInforme.fechaEnvio,
        leido: distribucionInforme.leido,
        leidoEn: informeAcuse.leidoEn,
      })
      .from(distribucionInforme)
      .innerJoin(usuario, eq(distribucionInforme.usuarioId, usuario.id))
      .leftJoin(
        informeAcuse,
        and(eq(informeAcuse.informeId, distribucionInforme.informeId), eq(informeAcuse.usuarioId, distribucionInforme.usuarioId)),
      )
      .where(eq(distribucionInforme.informeId, informeId))
      .orderBy(asc(usuario.nombre));

    const acciones = await executor
      .select({
        id: accion.id,
        hallazgoId: accion.hallazgoId,
        descripcion: accion.descripcion,
        causaRaiz: accion.causaRaiz,
        responsable: usuario.nombre,
        fechaLimite: accion.fechaLimite,
        estado: accion.estado,
      })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .innerJoin(usuario, eq(accion.responsableId, usuario.id))
      .where(eq(hallazgo.auditoriaId, auditoriaId))
      .orderBy(asc(accion.fechaLimite));

    let aprobadoPorNombre: string | null = null;
    if (base.informe.aceptadoPorId !== null) {
      const [aprobador] = await executor.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, base.informe.aceptadoPorId));
      aprobadoPorNombre = aprobador?.nombre ?? null;
    }

    const estado = InformeState.resolve(firma !== undefined, distribucion.length > 0);
    const criterios = base.auditoria.criterios ?? [];
    const huellaActual = InformeFingerprint.compute({
      objetivos: base.auditoria.objetivos,
      criterios,
      procesos: procesos.map((item) => item.nombre),
      equipo: equipo.map((item) => `${item.nombre}:${item.rol}`),
      hallazgos,
      fechaPlan: base.auditoria.fechaPlan,
      fechaReal: base.auditoria.fechaReal,
      conclusiones: base.informe.conclusiones,
    });

    return {
      id: base.informe.id,
      auditoriaId,
      organizacionId: base.organizacionId,
      organizacionNombre: base.organizacionNombre,
      periodo: base.periodo,
      estado,
      titulo: `Informe de auditoría interna ${base.periodo}`,
      liderId: base.auditoria.liderId,
      liderNombre: lider?.nombre ?? '',
      metodo: base.auditoria.metodo,
      objetivos: base.auditoria.objetivos,
      criterios,
      procesos: procesos.map((item) => item.nombre),
      procesoIds: procesos.map((item) => item.id),
      equipo: equipo.map((item) => ({ nombre: item.nombre, rol: item.rol })),
      hallazgos,
      fechaPlan: base.auditoria.fechaPlan,
      fechaReal: base.auditoria.fechaReal,
      conclusiones: base.informe.conclusiones,
      gradoConformidad: base.informe.gradoConformidad,
      declaracionMuestreo: base.informe.declaracionMuestreo,
      fechaEmision: base.informe.fechaEmision,
      aprobadoPorId: base.informe.aceptadoPorId,
      aprobadoPorNombre,
      firma:
        firma === undefined
          ? null
          : {
              firmanteId: firma.firmanteId,
              firmanteNombre: firma.firmanteNombre,
              firmadoEn: firma.firmadoEn.toISOString(),
              huella: firma.huella,
            },
      huellaActual,
      distribucion: distribucion.map((row) => ({
        usuarioId: row.usuarioId,
        nombre: row.nombre,
        rol: row.rol,
        fechaEnvio: row.fechaEnvio.toISOString(),
        leido: row.leido,
        leidoEn: row.leidoEn === null ? null : row.leidoEn.toISOString(),
      })),
      acciones,
    };
  }
}

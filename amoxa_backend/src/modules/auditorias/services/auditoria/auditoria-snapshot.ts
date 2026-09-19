import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';

export class AuditoriaSnapshot {
  public static of(detalle: AuditoriaDetalle): Record<string, unknown> {
    return {
      id: detalle.id,
      programaId: detalle.programaId,
      plantillaId: detalle.plantilla.id,
      liderId: detalle.liderId,
      objetivos: detalle.objetivos,
      criterios: detalle.criterios,
      metodo: detalle.metodo,
      fechaPlan: detalle.fechaPlan,
      viabilidadOk: detalle.viabilidadOk,
      planAprobado: detalle.planAprobado,
      estado: detalle.estado,
      procesos: detalle.procesos.map((item) => item.id),
      equipo: detalle.equipo.map((item) => ({ auditorId: item.auditorId, rol: item.rol })),
      plan: detalle.plan,
      contacto: detalle.contacto,
      revision: detalle.revision,
      propuestas: detalle.propuestas,
    };
  }
}

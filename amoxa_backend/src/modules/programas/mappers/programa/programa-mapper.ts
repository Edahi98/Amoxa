import { ProgramaStatus } from '@programas-rules-programa/programa-status.js';
import type { ProgramaDetail, ProgramaRow, ProgramaSummary, ProgramaView } from '@programas-mappers-programa/programa-view.js';

export class ProgramaMapper {
  public static toView(detail: ProgramaDetail): ProgramaView {
    const { row } = detail;
    return {
      id: row.id,
      periodo: row.periodo,
      objetivos: row.objetivos,
      riesgos: row.riesgosOportunidades,
      frecuencia: row.frecuencia,
      metodos: row.metodos,
      fecha_inicio: row.fechaInicio,
      fecha_fin: row.fechaFin,
      procesos_prioritarios: detail.procesos.map((process) => process.procesoId),
      procesos: detail.procesos.map((process) => ({
        id: process.procesoId,
        nombre: process.nombre,
        importancia: process.importancia,
        orden: process.orden,
        puntaje_sugerido: process.puntajeSugerido,
      })),
      prioridad_modificada: row.prioridadModificada,
      justificacion_prioridad: row.justificacionPrioridad,
      motivo_devolucion: row.motivoDevolucion,
      estado: row.estado,
      estado_etiqueta: ProgramaStatus.label(row.estado),
      version: row.version,
      creado_por: detail.creadoPor,
      enviado_en: row.enviadoEn?.toISOString() ?? null,
      aprobado_por: detail.aprobadoPor,
      aprobado_en: row.aprobadoEn?.toISOString() ?? null,
    };
  }

  public static stamp(value: Date | null): string {
    if (value === null) {
      return '';
    }
    return `${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(value)} UTC`;
  }

  public static toSummary(row: ProgramaRow): ProgramaSummary {
    return {
      id: row.id,
      periodo: row.periodo,
      estado: row.estado,
      estado_etiqueta: ProgramaStatus.label(row.estado),
      frecuencia: row.frecuencia,
      fecha_inicio: row.fechaInicio,
      fecha_fin: row.fechaFin,
      version: row.version,
    };
  }

  public static snapshot(detail: ProgramaDetail): Record<string, unknown> {
    return { ...ProgramaMapper.toView(detail) };
  }
}

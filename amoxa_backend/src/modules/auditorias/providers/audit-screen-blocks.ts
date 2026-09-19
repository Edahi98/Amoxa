import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditLabels } from '@auditorias-types/audit-labels.js';
import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import { PlanTextParser } from '@auditorias-parsers/plan-text-parser.js';
import { TemplateVigency } from '@auditorias-rules/template-vigency.js';

export interface GanttEntry {
  id: string;
  label: string;
  start: string;
  end: string;
  tone: 'primary' | 'muted';
}

export class AuditScreenBlocks {
  public static auditoria(detalle: AuditoriaDetalle): Record<string, unknown> {
    return {
      id: detalle.id,
      title: `Auditoría de ${detalle.procesos.map((item) => item.nombre).join(', ') || 'procesos por definir'}`,
      scope: detalle.procesos.map((item) => item.nombre).join(', '),
      method: detalle.metodo,
      startDate: detalle.plan.fechaInicio ?? detalle.fechaPlan ?? undefined,
      endDate: detalle.plan.fechaFin ?? undefined,
      status: AuditScreenBlocks.status(detalle.estado, detalle.plan.estado),
      leader: detalle.liderNombre,
      periodo: detalle.periodo,
      estado: detalle.estado,
      plan_estado: detalle.plan.estado,
      viabilidad_ok: detalle.viabilidadOk,
      plan_aprobado: detalle.planAprobado,
      objetivos: detalle.objetivos ?? '',
      procesos: detalle.procesos.map((item) => item.id),
      procesos_texto: detalle.procesos.map((item) => item.nombre).join(', '),
      criterios: detalle.criterios,
      criterios_texto: detalle.criterios.join(', '),
      plantilla_id: detalle.plantilla.id,
      plantilla_nombre: detalle.plantilla.nombre,
      plantilla_estado: TemplateVigency.screenState(detalle.plantilla),
      metodo: detalle.metodo,
      metodo_texto: AuditLabels.method(detalle.metodo),
    };
  }

  public static plan(detalle: AuditoriaDetalle): Record<string, unknown> {
    const names = new Map(detalle.equipo.map((member) => [member.auditorId, member.nombre]));
    const pending = detalle.propuestas.find((item) => item.estado === 'pendiente');
    return {
      estado: detalle.plan.estado,
      estado_texto: PlanStatusTransitions.describe(detalle.plan.estado),
      version: detalle.plan.version,
      fecha_inicio: detalle.plan.fechaInicio ?? '',
      fecha_fin: detalle.plan.fechaFin ?? '',
      agenda: PlanTextParser.renderAgenda(detalle.plan.agenda),
      tareas: PlanTextParser.renderTasks(detalle.plan.tareas, names),
      cronograma: AuditScreenBlocks.cronograma(detalle),
      fecha_propuesta: pending?.fechaPropuesta ?? '',
      motivo_propuesta: pending?.motivo ?? '',
      propuestas: detalle.propuestas.map((item) => ({
        id: item.id,
        title: item.fechaPropuesta,
        description: item.motivo ?? '',
        status: item.estado,
      })),
    };
  }

  public static cronograma(detalle: AuditoriaDetalle): GanttEntry[] {
    const entries: GanttEntry[] = [];
    const { fechaInicio, fechaFin, agenda } = detalle.plan;
    if (fechaInicio !== null && fechaFin !== null) {
      entries.push({ id: 'auditoria', label: 'Auditoría', start: fechaInicio, end: fechaFin, tone: 'primary' });
    }
    agenda.forEach((entry, index) => {
      if (entry.fecha !== null) {
        entries.push({ id: `agenda-${index + 1}`, label: entry.actividad, start: entry.fecha, end: entry.fecha, tone: 'muted' });
      }
    });
    return entries;
  }

  private static status(estado: AuditoriaDetalle['estado'], plan: AuditoriaDetalle['plan']['estado']): string {
    return estado === 'planificada'
      ? `Planificada, plan ${PlanStatusTransitions.describe(plan)}`
      : AuditStatusTransitions.describe(estado);
  }
}

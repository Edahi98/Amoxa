export interface PlanSnapshot {
  fechaInicio: string | null;
  fechaFin: string | null;
  agendaCount: number;
  tareasCount: number;
}

export interface RuleGap {
  codigo: string;
  mensaje: string;
}

export class PlanCompleteness {
  public static missing(plan: PlanSnapshot): RuleGap[] {
    const gaps: RuleGap[] = [];
    if (plan.fechaInicio === null || plan.fechaFin === null || plan.fechaFin < plan.fechaInicio) {
      gaps.push({
        codigo: 'PLAN_SIN_FECHAS',
        mensaje: 'El plan necesita fechas de inicio y fin, y el fin no puede ser anterior al inicio.',
      });
    }
    if (plan.agendaCount === 0) {
      gaps.push({ codigo: 'PLAN_SIN_AGENDA', mensaje: 'El plan necesita una agenda.' });
    }
    if (plan.tareasCount === 0) {
      gaps.push({ codigo: 'PLAN_SIN_TAREAS', mensaje: 'Reparta las tareas entre los integrantes del equipo.' });
    }
    return gaps;
  }
}

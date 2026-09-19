import type { PlanStatus } from '@auditorias-rules-plan/plan-status-transitions.js';

export type AuditStatus = 'planificada' | 'en_curso' | 'cerrada' | 'finalizada' | 'cancelada';

export class AuditStatusTransitions {
  private static readonly ALLOWED: Readonly<Record<AuditStatus, readonly AuditStatus[]>> = {
    planificada: ['en_curso', 'cancelada'],
    en_curso: ['cerrada', 'cancelada'],
    cerrada: ['finalizada'],
    finalizada: [],
    cancelada: [],
  };

  private static readonly LABELS: Readonly<Record<AuditStatus, string>> = {
    planificada: 'planificada',
    en_curso: 'en curso',
    cerrada: 'cerrada',
    finalizada: 'finalizada',
    cancelada: 'cancelada',
  };

  public static canMove(from: AuditStatus, to: AuditStatus): boolean {
    return AuditStatusTransitions.ALLOWED[from].includes(to);
  }

  public static isPlanning(status: AuditStatus): boolean {
    return status === 'planificada';
  }

  public static canStart(status: AuditStatus, plan: PlanStatus): boolean {
    return AuditStatusTransitions.canMove(status, 'en_curso') && plan === 'aprobado';
  }

  public static describe(status: AuditStatus): string {
    return AuditStatusTransitions.LABELS[status];
  }
}

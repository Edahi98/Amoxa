export type PlanStatus = 'sin_plan' | 'borrador' | 'enviado' | 'con_propuesta' | 'aprobado';

export class PlanStatusTransitions {
  private static readonly ALLOWED: Readonly<Record<PlanStatus, readonly PlanStatus[]>> = {
    sin_plan: ['borrador'],
    borrador: ['borrador', 'enviado'],
    enviado: ['aprobado', 'con_propuesta', 'borrador'],
    con_propuesta: ['borrador'],
    aprobado: [],
  };

  private static readonly SCOPE_EDITABLE: readonly PlanStatus[] = ['sin_plan', 'borrador', 'con_propuesta'];

  private static readonly KNOWN: readonly PlanStatus[] = ['borrador', 'enviado', 'con_propuesta', 'aprobado'];

  private static readonly LABELS: Readonly<Record<PlanStatus, string>> = {
    sin_plan: 'sin plan',
    borrador: 'en borrador',
    enviado: 'enviado al área auditada',
    con_propuesta: 'con propuesta de otra fecha',
    aprobado: 'aprobado',
  };

  public static canMove(from: PlanStatus, to: PlanStatus): boolean {
    return PlanStatusTransitions.ALLOWED[from].includes(to);
  }

  public static canEditScope(status: PlanStatus): boolean {
    return PlanStatusTransitions.SCOPE_EDITABLE.includes(status);
  }

  public static parse(value: string | null | undefined): PlanStatus {
    return PlanStatusTransitions.KNOWN.find((status) => status === value) ?? 'sin_plan';
  }

  public static describe(status: PlanStatus): string {
    return PlanStatusTransitions.LABELS[status];
  }
}

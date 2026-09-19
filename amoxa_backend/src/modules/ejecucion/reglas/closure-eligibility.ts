export interface FindingReviewState {
  id: string;
  revisado: boolean;
}

export interface ClosureEvaluation {
  puedeCerrar: boolean;
  pendientes: string[];
  message?: string;
}

export class ClosureEligibility {
  public static evaluate(findings: readonly FindingReviewState[]): ClosureEvaluation {
    const pendientes = findings.filter((finding) => !finding.revisado).map((finding) => finding.id);
    if (pendientes.length === 0) {
      return { puedeCerrar: true, pendientes };
    }
    return {
      puedeCerrar: false,
      pendientes,
      message: `No se puede cerrar la auditoría mientras haya hallazgos sin revisar (${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}).`,
    };
  }
}

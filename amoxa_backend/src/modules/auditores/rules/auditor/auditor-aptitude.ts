import type { EstadoAuditor } from '@auditores-rules/competence-calculator.js';

export class AuditorAptitude {
  private static readonly STATE_LABELS: Record<EstadoAuditor, string> = {
    apto: 'Apto',
    formacion: 'En formación',
    no_apto: 'No apto',
  };

  public static stateLabel(estado: EstadoAuditor): string {
    return AuditorAptitude.STATE_LABELS[estado];
  }

  public static isCurrentlyApto(estado: EstadoAuditor, vigenciaHasta: string | null, today: string): boolean {
    return estado === 'apto' && vigenciaHasta !== null && vigenciaHasta >= today;
  }

  public static describe(estado: EstadoAuditor, vigenciaHasta: string | null, today: string): string {
    if (estado !== 'apto') {
      return AuditorAptitude.STATE_LABELS[estado];
    }
    if (vigenciaHasta === null) {
      return 'Apto (sin vigencia registrada)';
    }
    return vigenciaHasta >= today ? `Apto hasta ${vigenciaHasta}` : `Vigencia vencida el ${vigenciaHasta}`;
  }

  public static today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

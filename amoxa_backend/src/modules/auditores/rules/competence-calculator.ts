export type EstadoAuditor = 'apto' | 'formacion' | 'no_apto';
export type ResultadoEvaluacion = 'satisfactorio' | 'no_satisfactorio';

export interface CompetenceInput {
  metodos: readonly string[];
  resultado: ResultadoEvaluacion;
  fecha: string;
  estadoActual: EstadoAuditor | null;
}

export interface CompetenceOutcome {
  estado: EstadoAuditor;
  vigenciaHasta: string | null;
}

export class CompetenceCalculator {
  public static readonly MIN_METHODS = 2;
  public static readonly VALIDITY_MONTHS = 12;

  public static distinctMethods(metodos: readonly string[]): string[] {
    return [...new Set(metodos)];
  }

  public static hasEnoughMethods(metodos: readonly string[]): boolean {
    return CompetenceCalculator.distinctMethods(metodos).length >= CompetenceCalculator.MIN_METHODS;
  }

  public static evaluate(input: CompetenceInput): CompetenceOutcome {
    if (input.resultado === 'satisfactorio' && CompetenceCalculator.hasEnoughMethods(input.metodos)) {
      return {
        estado: 'apto',
        vigenciaHasta: CompetenceCalculator.addMonths(input.fecha, CompetenceCalculator.VALIDITY_MONTHS),
      };
    }
    return { estado: input.estadoActual === 'apto' ? 'no_apto' : 'formacion', vigenciaHasta: null };
  }

  public static addMonths(isoDate: string, months: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const target = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  }
}

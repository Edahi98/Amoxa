export interface ProgramaDraft {
  periodo: string | null;
  objetivos: string | null;
  riesgosOportunidades: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export class ProgramaCompleteness {
  public static missing(draft: ProgramaDraft): string[] {
    const missing: string[] = [];
    if (ProgramaCompleteness.isBlank(draft.periodo)) missing.push('periodo');
    if (ProgramaCompleteness.isBlank(draft.objetivos)) missing.push('objetivos');
    if (ProgramaCompleteness.isBlank(draft.riesgosOportunidades)) missing.push('riesgos');
    if (ProgramaCompleteness.isBlank(draft.fechaInicio)) missing.push('inicio del calendario');
    if (ProgramaCompleteness.isBlank(draft.fechaFin)) missing.push('fin del calendario');
    if (
      !ProgramaCompleteness.isBlank(draft.fechaInicio) &&
      !ProgramaCompleteness.isBlank(draft.fechaFin) &&
      (draft.fechaFin as string) < (draft.fechaInicio as string)
    ) {
      missing.push('fin del calendario posterior al inicio');
    }
    return missing;
  }

  private static isBlank(value: string | null): boolean {
    return value === null || value.trim() === '';
  }
}

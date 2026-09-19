export const EVALUATION_METHODS = [
  'revision_registros',
  'retroalimentacion',
  'entrevista',
  'observacion',
  'testimonios',
  'examen',
] as const;

export type EvaluationMethod = (typeof EVALUATION_METHODS)[number];

export class MethodCatalog {
  private static readonly LABELS: Record<EvaluationMethod, string> = {
    revision_registros: 'Revisión de registros',
    retroalimentacion: 'Retroalimentación',
    entrevista: 'Entrevista',
    observacion: 'Observación en campo',
    testimonios: 'Testimonios',
    examen: 'Examen',
  };

  public static label(method: string): string {
    return MethodCatalog.LABELS[method as EvaluationMethod] ?? method;
  }
}

export interface ViabilityInput {
  informacionSuficiente: boolean;
  cooperacion: boolean;
  tiempo: boolean;
}

export class ContactViability {
  public static isComplete(input: ViabilityInput): boolean {
    return input.informacionSuficiente && input.cooperacion && input.tiempo;
  }

  public static missingLabels(input: ViabilityInput): string[] {
    const labels: string[] = [];
    if (!input.informacionSuficiente) labels.push('información suficiente');
    if (!input.cooperacion) labels.push('cooperación del área');
    if (!input.tiempo) labels.push('tiempo suficiente');
    return labels;
  }
}

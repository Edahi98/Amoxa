export interface TemplateState {
  vigente: boolean;
}

export class TemplateVigency {
  public static isCurrent(template: TemplateState | undefined): boolean {
    return template !== undefined && template.vigente;
  }

  public static screenState(template: TemplateState | undefined): 'publicada' | 'obsoleta' {
    return TemplateVigency.isCurrent(template) ? 'publicada' : 'obsoleta';
  }
}

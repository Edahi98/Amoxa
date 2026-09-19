export interface EvidenceVerification {
  respuestaId: string;
  verificada: boolean;
  archivos: number;
}

export class EvidenceFindingState {
  public static from(state: EvidenceVerification): Record<string, unknown> {
    return { 'hallazgo.evidencias_verificadas': state.verificada ? [state.respuestaId] : [] };
  }
}

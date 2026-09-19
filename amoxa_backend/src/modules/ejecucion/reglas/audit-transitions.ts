export type AuditState = 'planificada' | 'en_curso' | 'cerrada' | 'finalizada' | 'cancelada';

export class AuditTransitions {
  private static readonly TERMINAL_LABELS: Readonly<Record<'cerrada' | 'finalizada' | 'cancelada', string>> = {
    cerrada: 'cerrada',
    finalizada: 'finalizada',
    cancelada: 'cancelada',
  };

  public static openViolation(state: AuditState, planAprobado: boolean): string | undefined {
    if (state === 'en_curso') {
      return 'La reunión de apertura ya se registró y la auditoría está en curso.';
    }
    if (state !== 'planificada') {
      return 'Solo se puede abrir una auditoría planificada.';
    }
    if (!planAprobado) {
      return 'La auditoría solo puede abrirse cuando el plan esté aprobado.';
    }
    return undefined;
  }

  public static executionViolation(state: AuditState): string | undefined {
    if (state === 'en_curso') {
      return undefined;
    }
    if (state === 'planificada') {
      return 'La auditoría aún no está en curso: el líder debe registrar la reunión de apertura primero.';
    }
    return `La auditoría ya no admite cambios porque está ${AuditTransitions.TERMINAL_LABELS[state]}.`;
  }

  public static closeViolation(state: AuditState): string | undefined {
    if (state === 'en_curso') {
      return undefined;
    }
    if (state === 'cerrada' || state === 'finalizada') {
      return 'La auditoría ya está cerrada.';
    }
    return 'Solo se puede cerrar una auditoría que esté en curso.';
  }
}

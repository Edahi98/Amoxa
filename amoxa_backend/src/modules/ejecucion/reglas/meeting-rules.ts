export class MeetingRules {
  public static attendees(ids: readonly string[], presidingId: string): string[] {
    return [...new Set(ids.filter((id) => id !== presidingId))];
  }

  public static attendeesViolation(ids: readonly string[], presidingId: string): string | undefined {
    return MeetingRules.attendees(ids, presidingId).length === 0
      ? 'Registre a los asistentes de la reunión: además del líder debe asistir al menos una persona.'
      : undefined;
  }

  public static motiveViolation(motivo: string | undefined | null): string | undefined {
    return motivo === undefined || motivo === null || motivo.trim() === ''
      ? 'Explique por escrito el motivo de la discrepancia.'
      : undefined;
  }

  public static resultViolation(resultado: string | undefined | null): string | undefined {
    return resultado === 'aceptado' || resultado === 'discrepa'
      ? undefined
      : 'Anote si el área aceptó o discrepó del hallazgo.';
  }
}

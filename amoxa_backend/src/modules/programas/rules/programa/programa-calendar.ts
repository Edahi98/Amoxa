export interface CalendarEventView {
  id: string;
  date: string;
  title: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  status?: string;
}

export interface CalendarAuditInput {
  id: string;
  fechaPlan: string | null;
  estado: string;
  objetivos: string | null;
}

export interface CalendarProgramInput {
  id: string;
  periodo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export class ProgramaCalendar {
  private static readonly AUDIT_TONE: Record<string, CalendarEventView['tone']> = {
    planificada: 'primary',
    en_curso: 'warning',
    cerrada: 'success',
    cancelada: 'neutral',
  };

  public static events(program: CalendarProgramInput, audits: readonly CalendarAuditInput[]): CalendarEventView[] {
    const events: CalendarEventView[] = [];
    if (program.fechaInicio !== null) {
      events.push({ id: `${program.id}-inicio`, date: program.fechaInicio, title: `Inicio del programa ${program.periodo}`, tone: 'primary' });
    }
    if (program.fechaFin !== null) {
      events.push({ id: `${program.id}-fin`, date: program.fechaFin, title: `Fin del programa ${program.periodo}`, tone: 'neutral' });
    }
    for (const audit of audits) {
      if (audit.fechaPlan === null) continue;
      events.push({
        id: audit.id,
        date: audit.fechaPlan,
        title: audit.objetivos !== null && audit.objetivos.trim() !== '' ? audit.objetivos.trim().slice(0, 60) : 'Auditoría',
        tone: ProgramaCalendar.AUDIT_TONE[audit.estado] ?? 'primary',
        status: audit.estado,
      });
    }
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
}

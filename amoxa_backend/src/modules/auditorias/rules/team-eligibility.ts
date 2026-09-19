export type AuditorStatus = 'apto' | 'formacion' | 'no_apto';

export type TeamRole = 'auditor' | 'formacion';

export interface TeamCandidate {
  usuarioId: string;
  nombre: string;
  procesoId: string | null;
  estado: AuditorStatus;
  vigenciaHasta: string | null;
}

export interface EligibilityVerdict {
  eligible: boolean;
  reason?: string;
}

export interface TeamConflict {
  auditorId: string;
  nombre: string;
  motivo: string;
}

export class TeamEligibility {
  public static evaluate(
    candidate: TeamCandidate,
    auditedProcessIds: readonly string[],
    today: string,
  ): EligibilityVerdict {
    if (candidate.procesoId !== null && auditedProcessIds.includes(candidate.procesoId)) {
      return { eligible: false, reason: 'Pertenece a un proceso que se audita: no puede auditar su propia área.' };
    }
    if (candidate.estado === 'no_apto') {
      return { eligible: false, reason: 'Auditor no apto: su evaluación de competencia no lo habilita.' };
    }
    if (candidate.vigenciaHasta !== null && candidate.vigenciaHasta < today) {
      return { eligible: false, reason: `Competencia vencida el ${candidate.vigenciaHasta}.` };
    }
    return { eligible: true };
  }

  public static conflicts(
    selectedIds: readonly string[],
    candidates: ReadonlyMap<string, TeamCandidate>,
    auditedProcessIds: readonly string[],
    today: string,
  ): TeamConflict[] {
    const found: TeamConflict[] = [];
    for (const id of new Set(selectedIds)) {
      const candidate = candidates.get(id);
      if (candidate === undefined) {
        found.push({ auditorId: id, nombre: id, motivo: 'No es un auditor registrado en la organización.' });
        continue;
      }
      const verdict = TeamEligibility.evaluate(candidate, auditedProcessIds, today);
      if (!verdict.eligible) {
        found.push({ auditorId: id, nombre: candidate.nombre, motivo: verdict.reason ?? 'No puede participar.' });
      }
    }
    return found;
  }

  public static roleFor(candidate: TeamCandidate): TeamRole {
    return candidate.estado === 'formacion' ? 'formacion' : 'auditor';
  }
}

import type { RuleGap } from '@auditorias-rules-plan/plan-completeness.js';

export interface ScopeSnapshot {
  procesoIds: readonly string[];
  criterios: readonly string[];
  plantillaVigente: boolean;
  metodo: string | null | undefined;
}

export class ScopeCompleteness {
  public static missing(scope: ScopeSnapshot): RuleGap[] {
    const gaps: RuleGap[] = [];
    if (scope.procesoIds.length === 0) {
      gaps.push({ codigo: 'ALCANCE_SIN_PROCESOS', mensaje: 'Elija al menos un proceso a auditar.' });
    }
    if (scope.criterios.length === 0) {
      gaps.push({ codigo: 'CRITERIOS_VACIOS', mensaje: 'Elija los criterios contra los que se audita.' });
    }
    if (!scope.plantillaVigente) {
      gaps.push({ codigo: 'PLANTILLA_NO_VIGENTE', mensaje: 'Solo se pueden usar plantillas vigentes.' });
    }
    if (scope.metodo === undefined || scope.metodo === null || scope.metodo === '') {
      gaps.push({ codigo: 'METODO_VACIO', mensaje: 'Indique si la auditoría será presencial, remota o mixta.' });
    }
    return gaps;
  }
}

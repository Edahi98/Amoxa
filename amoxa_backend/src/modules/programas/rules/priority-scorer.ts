export type ProcessImportance = 'alta' | 'media' | 'baja';

export interface ProcessSignal {
  id: string;
  nombre: string;
  importancia: ProcessImportance;
  nivelRiesgo: number;
  cambiosRecientes: boolean;
  incumplimientosPrevios: number;
}

export interface RankedProcess extends ProcessSignal {
  puntaje: number;
}

export class PriorityScorer {
  private static readonly IMPORTANCE_WEIGHT: Record<ProcessImportance, number> = { alta: 30, media: 20, baja: 10 };
  private static readonly RISK_WEIGHT = 5;
  private static readonly CHANGE_WEIGHT = 15;
  private static readonly NONCONFORMITY_WEIGHT = 10;

  public static score(signal: ProcessSignal): number {
    return (
      PriorityScorer.IMPORTANCE_WEIGHT[signal.importancia] +
      Math.max(0, signal.nivelRiesgo) * PriorityScorer.RISK_WEIGHT +
      (signal.cambiosRecientes ? PriorityScorer.CHANGE_WEIGHT : 0) +
      Math.max(0, signal.incumplimientosPrevios) * PriorityScorer.NONCONFORMITY_WEIGHT
    );
  }

  public static rank(signals: readonly ProcessSignal[]): RankedProcess[] {
    return signals
      .map((signal) => ({ ...signal, puntaje: PriorityScorer.score(signal) }))
      .sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre, 'es'));
  }

  public static isModified(selected: readonly string[], ranking: readonly RankedProcess[]): boolean {
    if (selected.length === 0) {
      return false;
    }
    const expected = ranking.slice(0, selected.length).map((process) => process.id);
    return expected.length !== selected.length || expected.some((id, index) => id !== selected[index]);
  }
}

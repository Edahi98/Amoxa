import type { RankedProcess } from '@programas-rules/priority-scorer.js';

export class FrequencySuggester {
  public static readonly CRITICAL_SCORE = 70;
  public static readonly SEMESTRAL = 'Semestral';
  public static readonly ANUAL = 'Anual';

  public static suggest(ranking: readonly RankedProcess[]): string {
    const hasCritical = ranking.some(
      (process) => process.puntaje >= FrequencySuggester.CRITICAL_SCORE || process.incumplimientosPrevios >= 2,
    );
    return hasCritical ? FrequencySuggester.SEMESTRAL : FrequencySuggester.ANUAL;
  }
}

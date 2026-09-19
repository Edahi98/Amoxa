export interface ChecklistProgressResult {
  total: number;
  respondidas: number;
  pendientes: number;
  avance: number;
}

export class ChecklistProgress {
  public static compute(total: number, respondidas: number): ChecklistProgressResult {
    const safeTotal = Math.max(0, Math.floor(total));
    const answered = Math.min(safeTotal, Math.max(0, Math.floor(respondidas)));
    return {
      total: safeTotal,
      respondidas: answered,
      pendientes: safeTotal - answered,
      avance: safeTotal === 0 ? 0 : Math.round((answered / safeTotal) * 100),
    };
  }

  public static version(versions: readonly number[]): number {
    return versions.reduce((sum, value) => sum + value, 0);
  }
}

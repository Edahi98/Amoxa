export type ChartKindName = 'bar' | 'line' | 'doughnut' | 'pie' | 'radar';

export class ChartKind {
  public static readonly MAX_ROUND_CATEGORIES = 5;

  public static readonly MAX_DIRECT_LABELS = 6;

  public static isRound(kind: ChartKindName): boolean {
    return kind === 'pie' || kind === 'doughnut';
  }

  public static resolve(kind: ChartKindName, categoryCount: number): ChartKindName {
    if (ChartKind.isRound(kind) && categoryCount > ChartKind.MAX_ROUND_CATEGORIES) {
      return 'bar';
    }
    return kind;
  }

  public static hasAxes(kind: ChartKindName): boolean {
    return kind === 'bar' || kind === 'line';
  }
}

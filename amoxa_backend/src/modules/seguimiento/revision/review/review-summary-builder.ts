import type { Indicators } from '@seguimiento-indicadores-indicator/indicator.types.js';

export interface ReviewSummaryInput {
  periodo: string;
  estado: string;
  indicadores: Indicators;
}

export class ReviewSummaryBuilder {
  private static readonly TOP_AREAS = 3;

  public static build(input: ReviewSummaryInput): string {
    const { indicadores } = input;
    const lines = [
      `Programa de auditoría del periodo ${input.periodo} (estado: ${input.estado}).`,
      `Cumplimiento del calendario: ${indicadores.cumplimiento_calendario}% (${indicadores.auditorias_realizadas} de ${indicadores.auditorias_planificadas} auditorías realizadas, ${indicadores.calendario.canceladas} canceladas).`,
      `Resultados de auditoría: ${indicadores.incumplimientos_totales} incumplimientos registrados, ${indicadores.hallazgos_abiertos} abiertos.`,
      `Acciones: ${indicadores.acciones_atrasadas} atrasadas.`,
    ];
    const areas = ReviewSummaryBuilder.topAreas(indicadores);
    if (areas.length > 0) {
      lines.push(`Áreas con más incumplimientos: ${areas.join(', ')}.`);
    }
    return lines.join('\n');
  }

  private static topAreas(indicadores: Indicators): string[] {
    const series = indicadores.incumplimientos_por_area;
    return series.labels
      .slice(0, ReviewSummaryBuilder.TOP_AREAS)
      .map((label, index) => `${label} (${series.datasets[0]?.data[index] ?? 0})`);
  }
}

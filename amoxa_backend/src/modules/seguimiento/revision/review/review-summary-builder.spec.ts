import { IndicatorCalculator } from '@seguimiento-indicadores-indicator/indicator-calculator.js';
import { ReviewSummaryBuilder } from '@seguimiento-revision-review/review-summary-builder.js';

describe('ReviewSummaryBuilder', () => {
  it('resume cierre del programa, resultados de auditoría y acciones', () => {
    const indicadores = IndicatorCalculator.compute({
      auditoriasPorEstado: [
        { estado: 'cerrada', total: 1 },
        { estado: 'planificada', total: 1 },
      ],
      incumplimientosPorArea: [{ procesoId: 'a', area: 'Compras', total: 2, pendientes: 1 }],
      accionesPorArea: [{ procesoId: 'a', area: 'Compras', total: 2, pendientes: 1 }],
      accionesPorEstado: [],
      accionesAtrasadas: [],
    });

    const summary = ReviewSummaryBuilder.build({ periodo: '2026', estado: 'en_ejecucion', indicadores });

    expect(summary).toContain('periodo 2026 (estado: en_ejecucion)');
    expect(summary).toContain('Cumplimiento del calendario: 50%');
    expect(summary).toContain('2 incumplimientos registrados, 1 abiertos');
    expect(summary).toContain('Acciones: 1 atrasadas');
    expect(summary).toContain('Áreas con más incumplimientos: Compras (2).');
  });

  it('omite las áreas cuando no hay incumplimientos', () => {
    const summary = ReviewSummaryBuilder.build({ periodo: '2027', estado: 'aprobado', indicadores: IndicatorCalculator.empty() });

    expect(summary).not.toContain('Áreas con más incumplimientos');
  });
});

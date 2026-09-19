import { IndicatorCalculator } from '@seguimiento-indicadores-indicator/indicator-calculator.js';
import type { IndicatorRaw } from '@seguimiento-indicadores-indicator/indicator.types.js';

describe('IndicatorCalculator', () => {
  const raw: IndicatorRaw = {
    auditoriasPorEstado: [
      { estado: 'planificada', total: 2 },
      { estado: 'en_curso', total: 1 },
      { estado: 'cerrada', total: 3 },
      { estado: 'finalizada', total: 1 },
      { estado: 'cancelada', total: 4 },
    ],
    incumplimientosPorArea: [
      { procesoId: 'a', area: 'Compras', total: 2, pendientes: 1 },
      { procesoId: 'b', area: 'Producción', total: 5, pendientes: 4 },
      { procesoId: 'c', area: 'Ventas', total: 0, pendientes: 0 },
    ],
    accionesPorArea: [
      { procesoId: 'a', area: 'Compras', total: 3, pendientes: 2 },
      { procesoId: 'b', area: 'Producción', total: 1, pendientes: 0 },
    ],
    accionesPorEstado: [
      { estado: 'vencida', total: 2 },
      { estado: 'pendiente', total: 1 },
    ],
    accionesAtrasadas: [],
  };

  it('calcula el cumplimiento del calendario con realizadas sobre planificadas sin contar canceladas', () => {
    const result = IndicatorCalculator.compute(raw);

    expect(result.auditorias_realizadas).toBe(4);
    expect(result.auditorias_planificadas).toBe(7);
    expect(result.cumplimiento_calendario).toBe(57.1);
    expect(result.calendario).toEqual({ planificadas: 7, realizadas: 4, en_curso: 1, canceladas: 4 });
  });

  it('suma incumplimientos, hallazgos abiertos y acciones atrasadas', () => {
    const result = IndicatorCalculator.compute(raw);

    expect(result.incumplimientos_totales).toBe(7);
    expect(result.hallazgos_abiertos).toBe(5);
    expect(result.acciones_atrasadas).toBe(2);
  });

  it('arma series para gráficas ordenadas de mayor a menor y sin áreas en cero', () => {
    const result = IndicatorCalculator.compute(raw);

    expect(result.incumplimientos_por_area).toEqual({
      labels: ['Producción', 'Compras'],
      datasets: [{ label: 'Incumplimientos', data: [5, 2] }],
    });
    expect(result.atrasadas_por_area).toEqual({ labels: ['Compras'], datasets: [{ label: 'Acciones atrasadas', data: [2] }] });
    expect(result.acciones_por_estado).toEqual({
      labels: ['Pendiente', 'Vencida'],
      datasets: [{ label: 'Acciones', data: [1, 2] }],
    });
  });

  it('devuelve ceros cuando no hay auditorías', () => {
    const result = IndicatorCalculator.empty();

    expect(result.cumplimiento_calendario).toBe(0);
    expect(result.incumplimientos_por_area.labels).toEqual([]);
  });

  it('redondea el porcentaje a un decimal', () => {
    expect(IndicatorCalculator.percentage(1, 3)).toBe(33.3);
    expect(IndicatorCalculator.percentage(5, 0)).toBe(0);
  });
});

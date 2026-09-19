import { ChartConfigBuilder } from '@utils-chart/ChartConfigBuilder.js';
import { ChartKind } from '@utils-chart/ChartKind.js';
import { ChartPalette } from '@utils-chart/ChartPalette.js';
import { ChartRegistry } from '@utils-chart/ChartRegistry.js';
import { DatasetTable } from '@utils-chart/DatasetTable.js';

describe('ChartKind', () => {
  it('degrada pie y doughnut con más de 5 categorías y respeta el resto', () => {
    expect(ChartKind.resolve('pie', 6)).toBe('bar');
    expect(ChartKind.resolve('doughnut', 9)).toBe('bar');
    expect(ChartKind.resolve('pie', 5)).toBe('pie');
    expect(ChartKind.resolve('line', 20)).toBe('line');
    expect(ChartKind.isRound('doughnut')).toBe(true);
    expect(ChartKind.hasAxes('radar')).toBe(false);
  });
});

describe('ChartPalette', () => {
  it('usa el valor del token o el respaldo cuando falta', () => {
    expect(ChartPalette.token({ '--color-accent': '#111111' }, '--color-accent')).toBe('#111111');
    expect(ChartPalette.token({}, '--color-accent')).toBe('#ea580c');
    expect(ChartPalette.token({ '--color-accent': '' }, '--color-accent')).toBe('#ea580c');
  });

  it('cicla colores, guiones y estilos de punto', () => {
    expect(ChartPalette.color({}, 0)).toBe(ChartPalette.color({}, 6));
    expect(ChartPalette.dash(0)).toEqual([]);
    expect(ChartPalette.dash(1)).not.toEqual(ChartPalette.dash(2));
    expect(ChartPalette.pointStyle(0)).not.toBe(ChartPalette.pointStyle(1));
    expect(ChartPalette.pointStyle(0)).toBe(ChartPalette.pointStyle(6));
  });

  it('convierte hex a rgba y deja intactos otros formatos', () => {
    expect(ChartPalette.withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(ChartPalette.withAlpha('rgb(1 2 3)', 0.5)).toBe('rgb(1 2 3)');
  });
});

describe('DatasetTable', () => {
  const datasets = [
    { label: 'A', data: [1, 2] },
    { label: 'B', data: [1234.5] },
  ];

  it('detecta estados vacíos', () => {
    expect(DatasetTable.isEmpty([], datasets)).toBe(true);
    expect(DatasetTable.isEmpty(['x'], [])).toBe(true);
    expect(DatasetTable.isEmpty(['x'], [{ label: 'A', data: [] }])).toBe(true);
    expect(DatasetTable.isEmpty(['x'], [{ label: 'A', data: [Number.NaN] }])).toBe(true);
    expect(DatasetTable.isEmpty(['x'], [{ label: 'A', data: [0] }])).toBe(false);
  });

  it('construye encabezados con unidad y filas formateadas es-MX', () => {
    const table = DatasetTable.build(['Ene', 'Feb'], datasets, 'NC');
    expect(table.headers).toEqual(['Categoría', 'A (NC)', 'B (NC)']);
    expect(table.rows[0]).toEqual(['Ene', '1', '1,234.5']);
    expect(table.rows[1]).toEqual(['Feb', '2', '—']);
    expect(DatasetTable.build(['Ene'], datasets).headers[1]).toBe('A');
    expect(DatasetTable.totalPoints(['a', 'b'], datasets)).toBe(4);
  });
});

describe('ChartConfigBuilder', () => {
  const labels = ['a', 'b', 'c'];
  const datasets = [
    { label: 'S1', data: [1, 2, 3] },
    { label: 'S2', data: [3, 2, 1] },
  ];

  it('line y radar diferencian series por guion y punto además del color', () => {
    const data = ChartConfigBuilder.data('line', labels, datasets, {});
    const [first, second] = data.datasets as unknown as Array<{ borderDash: number[]; pointStyle: string }>;
    expect(first.borderDash).not.toEqual(second.borderDash);
    expect(first.pointStyle).not.toBe(second.pointStyle);
    const radar = ChartConfigBuilder.data('radar', labels, datasets, {});
    expect((radar.datasets[0] as unknown as { fill: boolean }).fill).toBe(true);
  });

  it('pie usa un solo dataset y agrega valores a las etiquetas', () => {
    const data = ChartConfigBuilder.data('pie', labels, datasets, {}, 'NC');
    expect(data.datasets).toHaveLength(1);
    expect(data.labels?.[0]).toBe('a · 1 NC');
  });

  it('desactiva la animación con reduced-motion y define ejes con unidad', () => {
    const options = ChartConfigBuilder.options({ kind: 'bar', tokens: {}, labels, unit: 'NC', stacked: true, reducedMotion: true });
    expect(options.animation).toBe(false);
    const scales = options.scales as unknown as { y: { title: { text: string; display: boolean }; stacked: boolean } };
    expect(scales.y.title.text).toBe('NC');
    expect(scales.y.title.display).toBe(true);
    expect(scales.y.stacked).toBe(true);
    const animated = ChartConfigBuilder.options({ kind: 'line', tokens: {}, labels, reducedMotion: false });
    expect(animated.animation).not.toBe(false);
  });

  it('el tooltip formatea valores en es-MX', () => {
    const options = ChartConfigBuilder.options({ kind: 'bar', tokens: {}, labels, unit: 'kg', reducedMotion: true });
    const callbacks = (options.plugins as unknown as { tooltip: { callbacks: { label: (item: unknown) => string } } }).tooltip.callbacks;
    expect(callbacks.label({ dataset: { label: 'S1' }, parsed: 0, raw: 1234.5 })).toBe('S1: 1,234.5 kg');
  });

  it('registrar elementos es idempotente', () => {
    expect(() => {
      ChartRegistry.ensure();
      ChartRegistry.ensure();
    }).not.toThrow();
  });
});

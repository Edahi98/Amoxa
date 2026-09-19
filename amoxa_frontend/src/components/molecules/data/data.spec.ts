import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Chart } from '@molecules-data-chart/Chart.js';
import { Kpi } from '@molecules-data/Kpi.js';

const labels = ['Ene', 'Feb', 'Mar'];
const datasets = [
  { label: 'Abiertas', data: [4, 6, 3] },
  { label: 'Cerradas', data: [2, 5, 7] },
];

describe('molecules/data', () => {
  it('Kpi muestra valor formateado, unidad, delta y tendencia con texto oculto', () => {
    const html = renderToStaticMarkup(
      createElement(Kpi, { label: 'Cumplimiento', value: 1234.5, unit: '%', delta: '+3', trend: 'up', tone: 'success' }),
    );
    expect(html).toContain('Cumplimiento');
    expect(html).toContain('1,234.5');
    expect(html).toContain('%');
    expect(html).toContain('Sube');
    expect(html).toContain('+3');
    expect(html).toContain('tabular-nums');
  });

  it('Kpi mínimo, con tendencia a la baja y plana', () => {
    expect(renderToStaticMarkup(createElement(Kpi, { label: 'A', value: '—' }))).toContain('—');
    expect(renderToStaticMarkup(createElement(Kpi, { label: 'A', value: 1, trend: 'down', delta: -2 }))).toContain('Baja');
    expect(renderToStaticMarkup(createElement(Kpi, { label: 'A', value: 1, trend: 'flat' }))).toContain('Sin cambio');
  });

  it('Chart bar renderiza role img, aria-label y tabla accesible', () => {
    const html = renderToStaticMarkup(
      createElement(Chart, { kind: 'bar', labels, datasets, title: 'Hallazgos', ariaLabel: 'Hallazgos por mes', unit: 'NC' }),
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Hallazgos por mes"');
    expect(html).toContain('<details');
    expect(html).toContain('Ver datos en tabla');
    expect(html).toContain('<table');
    expect(html).toContain('<caption');
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('Abiertas (NC)');
  });

  it('Chart renderiza todos los tipos sin lanzar', () => {
    const kinds = ['bar', 'line', 'doughnut', 'pie', 'radar'] as const;
    for (const kind of kinds) {
      const html = renderToStaticMarkup(createElement(Chart, { kind, labels, datasets, ariaLabel: 'x', stacked: kind === 'bar' }));
      expect(html).toContain('<canvas');
    }
  });

  it('Chart degrada pie y doughnut a barras con más de 5 categorías', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'];
    const html = renderToStaticMarkup(createElement(Chart, { kind: 'pie', labels: many, datasets: [{ label: 'S', data: [1, 2, 3, 4, 5, 6] }], ariaLabel: 'x' }));
    expect(html).toContain('<canvas');
    expect(html).toContain('<table');
  });

  it('Chart sin datos muestra estado vacío y no canvas', () => {
    const empty = renderToStaticMarkup(createElement(Chart, { kind: 'line', labels: [], datasets: [], ariaLabel: 'x' }));
    expect(empty).toContain('Sin datos');
    expect(empty).not.toContain('<canvas');
    const noValues = renderToStaticMarkup(createElement(Chart, { kind: 'bar', labels, datasets: [{ label: 'A', data: [] }], ariaLabel: 'x' }));
    expect(noValues).toContain('Sin datos');
  });
});

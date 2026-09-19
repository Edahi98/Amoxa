import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GanttChart } from '@molecules-schedule/GanttChart.js';
import { ProgramCalendar } from '@molecules-schedule/ProgramCalendar.js';

const noop = () => undefined;

describe('molecules/schedule', () => {
  it('ProgramCalendar renderiza mes, navegación etiquetada, tabla y alternativa en lista', () => {
    const html = renderToStaticMarkup(
      createElement(ProgramCalendar, {
        month: '2026-09',
        onEventPress: noop,
        events: [
          { id: '1', date: '2026-09-10', title: 'Auditoría compras', tone: 'info', status: 'Planeada' },
          { id: '2', date: '2026-09-10', title: 'Auditoría ventas' },
          { id: '3', date: '2026-09-10', title: 'Auditoría RH' },
          { id: '4', date: '2026-09-10', title: 'Auditoría TI' },
        ],
      }),
    );
    expect(html).toContain('Septiembre de 2026');
    expect(html).toContain('aria-label="Mes anterior"');
    expect(html).toContain('aria-label="Mes siguiente"');
    expect(html).toContain('<table');
    expect(html).toContain('<caption');
    expect(html).toContain('scope="col"');
    expect(html).toContain('+2 más');
    expect(html).toContain('Ver eventos del mes en lista (4)');
    expect(html).toContain('Auditoría compras');
  });

  it('ProgramCalendar sin eventos y con mes inválido renderiza', () => {
    const empty = renderToStaticMarkup(createElement(ProgramCalendar, { month: '2026-02', events: [] }));
    expect(empty).toContain('Febrero de 2026');
    expect(empty).toContain('Sin eventos en');
    expect(renderToStaticMarkup(createElement(ProgramCalendar, { month: 'xx', events: [] }))).toContain('<table');
  });

  it('GanttChart renderiza filas, progreso con texto y alternativa tabla', () => {
    const html = renderToStaticMarkup(
      createElement(GanttChart, {
        onItemPress: noop,
        items: [
          { id: 'a', label: 'Planeación', start: '2026-01-05', end: '2026-02-20', progress: 60, tone: 'success' },
          { id: 'b', label: 'Ejecución', start: '2026-03-01', end: '2026-04-15' },
        ],
      }),
    );
    expect(html).toContain('Planeación');
    expect(html).toContain('60 %');
    expect(html).toContain('<details');
    expect(html).toContain('<table');
    expect(html).toContain('overflow-x-auto');
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  it('GanttChart sin ítems o con fechas inválidas muestra estado vacío', () => {
    expect(renderToStaticMarkup(createElement(GanttChart, { items: [] }))).toContain('Sin actividades programadas');
    expect(
      renderToStaticMarkup(createElement(GanttChart, { items: [{ id: 'x', label: 'X', start: 'nope', end: 'nada' }] })),
    ).toContain('Sin actividades programadas');
  });

  it('GanttChart respeta rango explícito', () => {
    const html = renderToStaticMarkup(
      createElement(GanttChart, {
        rangeStart: '2026-01-01',
        rangeEnd: '2026-12-31',
        items: [{ id: 'a', label: 'Anual', start: '2026-06-01', end: '2026-06-30' }],
      }),
    );
    expect(html).toContain('Anual');
    expect(html).toContain('role="img"');
  });
});

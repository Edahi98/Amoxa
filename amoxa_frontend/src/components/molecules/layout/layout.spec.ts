import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card } from '@molecules-layout/Card.js';
import { List } from '@molecules-layout/List.js';
import { Section } from '@molecules-layout/Section.js';
import { Tabs } from '@molecules-layout/Tabs.js';

describe('molecules/layout', () => {
  it('Section renderiza título, descripción, acciones y children; vacía también', () => {
    const html = renderToStaticMarkup(
      createElement(Section, { title: 'Programa', description: 'Desc', actions: createElement('button', null, 'Nuevo') }, 'contenido'),
    );
    expect(html).toContain('<section');
    expect(html).toContain('<h2');
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('Nuevo');
    expect(html).toContain('contenido');
    expect(renderToStaticMarkup(createElement(Section))).toContain('<section');
  });

  it('Card soporta los tres tonos, footer y elemento article', () => {
    const glass = renderToStaticMarkup(createElement(Card, { title: 'T', subtitle: 'S', tone: 'glass', footer: 'pie' }, 'x'));
    expect(glass).toContain('backdrop-blur');
    expect(glass).toContain('<footer');
    expect(renderToStaticMarkup(createElement(Card, { tone: 'muted' }, 'x'))).toContain('bg-muted');
    const article = renderToStaticMarkup(createElement(Card, { as: 'article', title: 'T' }));
    expect(article).toContain('<article');
    expect(article).toContain('aria-labelledby');
  });

  it('List renderiza ul con li por hijo y estado vacío', () => {
    const html = renderToStaticMarkup(createElement(List, { variant: 'divided' }, createElement('span', null, 'a'), createElement('span', null, 'b')));
    expect(html).toContain('<ul');
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain('divide-y');
    const empty = renderToStaticMarkup(createElement(List, { emptyText: 'Nada' }));
    expect(empty).toContain('Nada');
    expect(empty).not.toContain('<ul');
  });

  it('Tabs implementa el patrón WAI-ARIA con roving tabindex y paneles', () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, {
        id: 'tb',
        defaultTab: 'b',
        tabs: [
          { id: 'a', label: 'Uno', content: 'contenido a' },
          { id: 'b', label: 'Dos', content: 'contenido b' },
        ],
      }),
    );
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="tb-panel-a"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('contenido b');
    expect(html).not.toContain('contenido a');
    expect(html).toContain('tabindex="-1"');
  });

  it('Tabs controlado respeta value y no renderiza sin pestañas', () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, { value: 'a', tabs: [{ id: 'a', label: 'Uno', content: 'aa' }, { id: 'b', label: 'Dos', content: 'bb' }] }),
    );
    expect(html).toContain('aa');
    expect(renderToStaticMarkup(createElement(Tabs, { tabs: [] }))).toBe('');
  });
});

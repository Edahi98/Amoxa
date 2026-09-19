import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Container } from '@atoms-layout/Container.js';
import { Divider } from '@atoms-layout/Divider.js';
import { Stack } from '@atoms-layout/Stack.js';

describe('atoms/layout', () => {
  it('Stack aplica dirección, gap, alineación, wrap, id y className', () => {
    const html = renderToStaticMarkup(
      createElement(Stack, { direction: 'row', gap: 'lg', align: 'center', wrap: true, id: 's1', className: 'extra' }, 'x'),
    );
    expect(html).toContain('flex-row');
    expect(html).toContain('gap-6');
    expect(html).toContain('items-center');
    expect(html).toContain('flex-wrap');
    expect(html).toContain('id="s1"');
    expect(html).toContain('extra');
  });

  it('Stack renderiza vacío y con valores por defecto', () => {
    expect(renderToStaticMarkup(createElement(Stack))).toContain('flex-col');
  });

  it('Divider sin etiqueta usa hr y con etiqueta usa role separator', () => {
    expect(renderToStaticMarkup(createElement(Divider))).toContain('<hr');
    const labeled = renderToStaticMarkup(createElement(Divider, { label: 'o' }));
    expect(labeled).toContain('role="separator"');
    expect(labeled).toContain('>o<');
  });

  it('Container mantiene su contrato', () => {
    expect(renderToStaticMarkup(createElement(Container, { className: 'k', children: 'a' }))).toContain('max-w-6xl');
  });
});

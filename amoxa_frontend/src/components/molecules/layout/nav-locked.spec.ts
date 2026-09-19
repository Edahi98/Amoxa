import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NavLocked } from '@molecules-layout/NavLocked.js';

describe('NavLocked', () => {
  const html = renderToStaticMarkup(createElement(NavLocked, { label: 'Ejecución', hint: '5 pantallas · se desbloquea al avanzar' }));

  it('muestra el ajolote decorativo, la etiqueta y por qué está bloqueado', () => {
    expect(html).toContain('<img');
    expect(html).toContain('alt=""');
    expect(html).toContain('Ejecución');
    expect(html).toContain('5 pantallas · se desbloquea al avanzar');
  });

  it('no es un botón ni un enlace y se anuncia como bloqueado', () => {
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<a ');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-label="Ejecución, bloqueado. 5 pantallas · se desbloquea al avanzar"');
  });

  it('usa un degradado translúcido del rosa del ajolote como fondo', () => {
    expect(html).toContain('linear-gradient(135deg,rgba(247,179,194,0.28)_0%,rgba(238,142,154,0.14)_100%)');
  });
});

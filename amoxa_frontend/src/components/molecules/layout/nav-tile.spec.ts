import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Users } from '@phosphor-icons/react';
import { Grid, GridStyles } from '@atoms-layout/Grid.js';
import { NavTile } from '@molecules-layout/NavTile.js';
import { IconCatalog } from '@utils-icon/IconCatalog.js';

describe('NavTile', () => {
  it('muestra ícono decorativo, título y descripción en un botón', () => {
    const html = renderToStaticMarkup(createElement(NavTile, { title: 'Usuarios', description: 'Cuentas y roles', icon: Users }));

    expect(html).toContain('<button');
    expect(html).toContain('Usuarios');
    expect(html).toContain('Cuentas y roles');
    expect(html).toContain('aria-hidden="true"');
  });

  it('sin ícono ni descripción solo dibuja el título', () => {
    const html = renderToStaticMarkup(createElement(NavTile, { title: 'Solo título' }));

    expect(html).toContain('Solo título');
    expect(html).not.toContain('size-11');
  });
});

describe('Grid', () => {
  it('reduce columnas según el ancho', () => {
    expect(GridStyles.classes(3, 'md')).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    expect(GridStyles.classes(4, 'md')).toContain('grid-cols-2 lg:grid-cols-4');
  });

  it('renderiza sus hijos', () => {
    expect(renderToStaticMarkup(createElement(Grid, { columns: 2 }, createElement('span', null, 'a')))).toContain('<span>a</span>');
  });
});

describe('IconCatalog', () => {
  it('resuelve solo claves conocidas', () => {
    expect(IconCatalog.resolve('users')).toBe(Users);
    expect(IconCatalog.resolve('no-existe')).toBeUndefined();
    expect(IconCatalog.resolve(undefined)).toBeUndefined();
  });
});

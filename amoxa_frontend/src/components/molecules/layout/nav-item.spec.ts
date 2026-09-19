import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NavItem, NavItemState } from '@molecules-layout/NavItem.js';

const render = (path: string, target: string) =>
  renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(NavItem, { label: 'Usuarios', target })));

describe('NavItem', () => {
  it('reconoce el destino activo por la ruta', () => {
    expect(NavItemState.isActive('/dashboard', 'inicio')).toBe(true);
    expect(NavItemState.isActive('/app/usuario.lista', 'usuario.lista')).toBe(true);
    expect(NavItemState.isActive('/app/usuario.lista', 'inicio')).toBe(false);
    expect(NavItemState.isActive('/app/usuario.lista', undefined)).toBe(false);
  });

  it('marca aria-current solo cuando la ruta coincide', () => {
    expect(render('/app/usuario.lista', 'usuario.lista')).toContain('aria-current="page"');
    expect(render('/dashboard', 'usuario.lista')).not.toContain('aria-current');
  });

  it('el ítem activo usa el par de tokens con contraste suficiente', () => {
    expect(render('/app/usuario.lista', 'usuario.lista')).toContain('bg-primary-muted');
    expect(render('/app/usuario.lista', 'usuario.lista')).toContain('text-on-primary-muted');
  });
});

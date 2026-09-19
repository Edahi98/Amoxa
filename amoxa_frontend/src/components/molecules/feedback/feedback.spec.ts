import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Banner } from '@molecules-feedback/Banner.js';
import { EmptyState } from '@molecules-feedback/EmptyState.js';
import { Dialog } from '@molecules-feedback/Dialog.js';
import { ToastRegion } from '@molecules-feedback/ToastRegion.js';

describe('molecules/feedback', () => {
  it('Banner usa role alert para danger/warning y status para info/success', () => {
    expect(renderToStaticMarkup(createElement(Banner, { tone: 'danger', message: 'Falló' }))).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(Banner, { tone: 'warning', message: 'Ojo' }))).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(Banner, { tone: 'info', message: 'Aviso' }))).toContain('role="status"');
    expect(renderToStaticMarkup(createElement(Banner, { tone: 'success', message: 'Listo' }))).toContain('role="status"');
  });

  it('Banner muestra título, mensaje, icono y acción', () => {
    const html = renderToStaticMarkup(
      createElement(Banner, { tone: 'success', title: 'Guardado', message: 'Se guardó', action: createElement('button', null, 'Deshacer') }),
    );
    expect(html).toContain('Guardado');
    expect(html).toContain('Se guardó');
    expect(html).toContain('<svg');
    expect(html).toContain('Deshacer');
  });

  it('EmptyState renderiza título, descripción y acciones; también mínimo', () => {
    const html = renderToStaticMarkup(createElement(EmptyState, { title: 'Sin hallazgos', description: 'Aún no hay' }, createElement('button', null, 'Crear')));
    expect(html).toContain('Sin hallazgos');
    expect(html).toContain('Aún no hay');
    expect(html).toContain('Crear');
    expect(renderToStaticMarkup(createElement(EmptyState, { title: 'Vacío' }))).toContain('Vacío');
  });

  it('Dialog no renderiza nada cerrado y abierto usa dialog nativo con título accesible', () => {
    expect(renderToStaticMarkup(createElement(Dialog, { open: false, title: 'Cerrado', onClose: () => undefined }))).toBe('');

    const html = renderToStaticMarkup(
      createElement(
        Dialog,
        { open: true, title: 'Confirmar', description: 'Seguro', onClose: () => undefined, footer: createElement('button', null, 'Aceptar') },
        createElement('p', null, 'Contenido'),
      ),
    );
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-describedby=');
    expect(html).toMatch(/<h2[^>]*>Confirmar<\/h2>/);
    expect(html).toContain('aria-label="Cerrar"');
    expect(html).toContain('Contenido');
    expect(html).toContain('Aceptar');
  });

  it('ToastRegion es una región aria-live polite que no roba foco', () => {
    const html = renderToStaticMarkup(
      createElement(ToastRegion, {
        toasts: [
          { id: '1', message: 'Guardado', tone: 'success' },
          { id: '2', message: 'Falló', tone: 'danger' },
        ],
        onDismiss: () => undefined,
      }),
    );
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Notificaciones"');
    expect(html).toContain('Guardado');
    expect(html).toContain('Falló');
    expect(html).toContain('aria-label="Cerrar notificación"');
    expect(html).not.toContain('autofocus');
    expect(renderToStaticMarkup(createElement(ToastRegion, { toasts: [], onDismiss: () => undefined }))).toContain('aria-live="polite"');
  });
});

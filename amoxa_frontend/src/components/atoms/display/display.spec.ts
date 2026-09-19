import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge } from '@atoms-display/Badge.js';
import { ClauseTag } from '@atoms-display/ClauseTag.js';
import { ProgressBar } from '@atoms-display/ProgressBar.js';
import { SyncStatus, SyncStatusModel } from '@atoms-display/SyncStatus.js';
import { Text } from '@atoms-display/Text.js';

describe('atoms/display', () => {
  it('Text elige elemento por variante y admite children, tono y as', () => {
    expect(renderToStaticMarkup(createElement(Text, { text: 'Hola', variant: 'title' }))).toContain('<h2');
    expect(renderToStaticMarkup(createElement(Text, { variant: 'label', tone: 'danger' }, 'x'))).toContain('text-destructive');
    expect(renderToStaticMarkup(createElement(Text, { text: 'a', as: 'span', id: 't' }))).toContain('<span id="t"');
    expect(renderToStaticMarkup(createElement(Text, { text: 'c', variant: 'caption' }))).toContain('text-muted-foreground');
  });

  it('Badge muestra icono por tono y texto', () => {
    const tones = ['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const;
    for (const tone of tones) {
      const html = renderToStaticMarkup(createElement(Badge, { label: 'Estado', tone }));
      expect(html).toContain('Estado');
      expect(html).toContain('<svg');
      expect(html).toContain('aria-hidden="true"');
    }
  });

  it('ProgressBar expone progressbar con valores y texto visible del porcentaje', () => {
    const html = renderToStaticMarkup(createElement(ProgressBar, { id: 'p', value: 45, label: 'Avance' }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="45"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-labelledby="p-label"');
    expect(html).toContain('45 %');
  });

  it('ProgressBar limita valores fuera de rango y sin etiqueta usa aria-label', () => {
    const high = renderToStaticMarkup(createElement(ProgressBar, { value: 250 }));
    expect(high).toContain('aria-valuenow="100"');
    expect(high).toContain('aria-label="Progreso"');
    expect(renderToStaticMarkup(createElement(ProgressBar, { value: -5 }))).toContain('aria-valuenow="0"');
    expect(renderToStaticMarkup(createElement(ProgressBar, { value: Number.NaN }))).toContain('aria-valuenow="0"');
  });

  it('ClauseTag muestra cláusula, norma y título', () => {
    const html = renderToStaticMarkup(createElement(ClauseTag, { clause: '8.5.1', standard: 'ISO 9001', title: 'Producción' }));
    expect(html).toContain('ISO 9001 · 8.5.1');
    expect(html).toContain('Producción');
    expect(renderToStaticMarkup(createElement(ClauseTag, { clause: '7.1' }))).toContain('Cláusula 7.1');
  });

  it('SyncStatus expone role status con aria-live polite en todos los estados', () => {
    const states = ['synced', 'pending', 'offline', 'error'] as const;
    for (const state of states) {
      const html = renderToStaticMarkup(createElement(SyncStatus, { state, pending: 3, lastSyncAt: '2026-09-18T10:00:00Z' }));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('Última sincronización');
    }
    expect(SyncStatusModel.text('pending', 1)).toBe('1 cambio pendiente');
    expect(SyncStatusModel.text('pending', 4)).toBe('4 cambios pendientes');
    expect(SyncStatusModel.text('synced')).toBe('Sincronizado');
    expect(SyncStatusModel.text('offline')).toBe('Sin conexión');
  });
});

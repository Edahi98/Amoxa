import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SduiFixtures } from '@sdui-testing/sdui-fixtures';
import { ScreenRuntimeProvider } from '@contexts/ScreenRuntimeContext.js';
import { ScreenRenderer } from '@sdui-react-screen/ScreenRenderer';
import { OfflineQueue } from '@sdui-offline-queue/offline-queue';
import { MemoryStorage } from '@sdui-offline-storage/memory-storage';
import { SyncManager } from '@sdui-offline/sync-manager';
import { ComponentModel } from '@sdui-model-component/component.model';
import { ScreenModel } from '@sdui-model-screen/screen.model';
import type { ComponentType } from '@sdui-model/sdui-enums';
import type { RuntimeHost } from '@sdui-runtime/runtime-types';

const HOST: RuntimeHost = {
  navigate: () => undefined,
  logout: () => undefined,
  getToken: () => 'token',
  reload: () => undefined,
};

function render(screen: ScreenModel, revealErrors = false): string {
  const queue = new OfflineQueue(new MemoryStorage());
  const sync = new SyncManager(queue, { getToken: () => 'token', isOnline: () => true });
  return renderToStaticMarkup(
    createElement(ScreenRuntimeProvider, { screen, host: HOST, sync, queue, revealErrors }, createElement(ScreenRenderer)),
  );
}

function buttonMarkup(html: string, label: string): string {
  const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
  return buttons.find((markup) => markup.includes(label)) ?? '';
}

describe('ScreenRenderer (SSR)', () => {
  const screen = SduiFixtures.screen();

  it('renderiza título y subtítulo con un h1', () => {
    const html = render(screen);
    expect(html).toMatch(/<h1[^>]*>Programa de auditoría<\/h1>/);
    expect(html).toContain('Edición del periodo');
  });

  it('renderiza todos los tipos de componente del contrato sin lanzar', () => {
    const html = render(screen);

    ['Bienvenida', 'Programa 2026', 'Borrador', 'Auditorías', 'Avance', 'ISO 9001', 'Captura', 'Resumen'].forEach((text) =>
      expect(html, text).toContain(text),
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('Auditoría interna');
    expect(html).toContain('Elemento simple');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Contenido A');

    ['Periodo', 'Objetivo', 'Presupuesto', 'Inicio', 'Tipo', 'Áreas', 'Activo', 'Modo', 'Responsable', 'Proceso', 'Cláusulas'].forEach((label) =>
      expect(html, label).toContain(label),
    );
    expect(html).toContain('¿Se controla la información documentada?');
    expect(html).toContain('Evidencia');
    expect(html).toContain('Firma del gestor');
    expect(html).toContain('Ubicación');

    ['Falta de evidencia', 'Corregir registro', 'Auditoría A', 'Incumplimientos por área', 'Los datos se guardan sin conexión.', 'Sin hallazgos', 'Crea el primero', 'Sincronizado'].forEach(
      (text) => expect(html, text).toContain(text),
    );
    expect(html).toContain('Guardar programa');
  });

  it('cablea el valor enlazado con bind en los controles', () => {
    const bound = SduiFixtures.screen((raw) => {
      (raw['context'] as { data: { programa: Record<string, unknown> } }).data.programa['periodo'] = '2027';
    });
    expect(render(bound)).toContain('value="2027"');
  });

  it('visible_if falso oculta el componente sin renderizarlo', () => {
    expect(render(screen)).not.toContain('Solo dirección');

    const direccion = SduiFixtures.screen((raw) => {
      (raw['context'] as { user: { rol: string } }).user.rol = 'direccion';
    });
    expect(render(direccion)).toContain('Solo dirección');
  });

  it('enabled_if falso deshabilita el control', () => {
    expect(buttonMarkup(render(screen), 'Editar cerrado')).toContain('disabled=""');

    const cerrado = SduiFixtures.screen((raw) => {
      (raw['context'] as { entity: { estado: string } }).entity.estado = 'cerrado';
    });
    expect(buttonMarkup(render(cerrado), 'Editar cerrado')).not.toContain('disabled=""');
  });

  it('la máquina de estados deshabilita las acciones no permitidas por rol', () => {
    expect(buttonMarkup(render(screen), 'Cerrar programa')).toContain('disabled=""');
    expect(buttonMarkup(render(screen), 'Guardar programa')).not.toContain('disabled=""');
  });

  it('muestra los errores de campo desde validations cuando se revelan', () => {
    const hidden = render(screen);
    expect(hidden).not.toContain('aria-invalid="true"');
    expect(hidden).not.toContain('No se puede continuar');

    const revealed = render(screen, true);
    expect(revealed).toContain('aria-invalid="true"');
    expect(revealed).toContain('role="alert"');
    expect(revealed).toContain('Indique el periodo del programa.');
    expect(revealed).toContain('No se puede continuar');
    expect(revealed).toContain('href="#periodo"');
  });

  it('muestra el error de required cuando el campo está vacío', () => {
    const required = SduiFixtures.screen((raw) => {
      const root = raw['root'] as { children: Array<{ children: Array<Record<string, unknown>> }> };
      const objetivo = root.children[1].children.find((child) => child['id'] === 'objetivo');
      if (objetivo) objetivo['required'] = true;
    });

    const html = render(required, true);

    expect(html).toContain('Este campo es obligatorio.');
    expect(html).toContain('Objetivo');
  });

  it('muestra los banners de reglas warn e info arriba, con resumen enfocable', () => {
    const html = render(screen);

    expect(html).toContain('aria-label="Resumen de validación"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('El avance del programa es bajo.');
    expect(html).toContain('El programa sigue en borrador.');
    expect(html.indexOf('Resumen de validación')).toBeLessThan(html.indexOf('Datos generales'));
  });

  it('un tipo desconocido muestra un aviso accesible sin romper el resto', () => {
    const unknown = new ComponentModel({ type: 'no_existe' as unknown as ComponentType, id: 'x' });
    const text = new ComponentModel({ type: 'text', id: 't', props: { text: 'Sigue visible' } });
    const custom = new ScreenModel({
      ...screen,
      root: new ComponentModel({ type: 'container', id: 'r', children: [unknown, text] }),
    });

    const html = render(custom);

    expect(html).toContain('role="note"');
    expect(html).toContain('no se puede mostrar');
    expect(html).toContain('Sigue visible');
  });

  it('una pantalla sin contenido muestra el estado vacío', () => {
    const empty = new ScreenModel({ ...screen, root: new ComponentModel({ type: 'container', id: 'r' }) });
    expect(render(empty)).toContain('Sin contenido');
  });

  it('incluye la región de notificaciones', () => {
    expect(render(screen)).toContain('aria-label="Notificaciones"');
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FileInput } from '@molecules-form/FileInput.js';
import { FileEncoder } from '@utils-file/FileEncoder.js';

const file = (name: string, type: string, size = 1) => ({ name, type, size });

describe('FileEncoder', () => {
  it('acepta por extensión, por tipo exacto y por comodín', () => {
    expect(FileEncoder.accepts(file('a.XLSX', ''), '.xlsx,.docx')).toBe(true);
    expect(FileEncoder.accepts(file('a.pdf', 'application/pdf'), 'application/pdf')).toBe(true);
    expect(FileEncoder.accepts(file('a.png', 'image/png'), 'image/*')).toBe(true);
    expect(FileEncoder.accepts(file('a.exe', 'application/x-msdownload'), '.pdf,image/*')).toBe(false);
    expect(FileEncoder.accepts(file('a.exe', ''), '')).toBe(true);
  });

  it('rechaza archivos vacíos, demasiado grandes o de otro tipo', () => {
    expect(FileEncoder.violation(file('a.pdf', 'application/pdf', 0), '.pdf', 100)).toContain('vacío');
    expect(FileEncoder.violation(file('a.pdf', 'application/pdf', 2 * 1024 * 1024), '.pdf', 1024 * 1024)).toContain('1 MB');
    expect(FileEncoder.violation(file('a.exe', '', 10), '.pdf', 100)).toContain('no está permitido');
    expect(FileEncoder.violation(file('a.pdf', 'application/pdf', 10), '.pdf', 100)).toBeUndefined();
  });
});

describe('FileInput', () => {
  const render = (props: Partial<Parameters<typeof FileInput>[0]> = {}) =>
    renderToStaticMarkup(createElement(FileInput, { label: 'Logotipo', value: null, onValueChange: () => undefined, ...props }));

  it('muestra la etiqueta, el selector y que no hay archivo elegido', () => {
    const html = render({ hint: 'PNG o JPG' });

    expect(html).toContain('Logotipo');
    expect(html).toContain('type="file"');
    expect(html).toContain('Elegir archivo');
    expect(html).toContain('Ningún archivo elegido');
    expect(html).toContain('PNG o JPG');
  });

  it('con un archivo muestra su nombre y tamaño y permite quitarlo con una etiqueta accesible', () => {
    const html = render({ value: { nombre: 'logo.png', tipo: 'image/png', tamano: 2048, contenido: 'AAAA' } });

    expect(html).toContain('logo.png');
    expect(html).toContain('Cambiar archivo');
    expect(html).toContain('aria-label="Quitar logo.png"');
  });

  it('un error reemplaza la pista y se anuncia', () => {
    const html = render({ hint: 'PNG', error: 'Elija un archivo.' });

    expect(html).toContain('role="alert"');
    expect(html).toContain('Elija un archivo.');
    expect(html).not.toContain('>PNG<');
  });
});

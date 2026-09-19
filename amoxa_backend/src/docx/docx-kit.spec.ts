import { DOCX_MIME } from '@docx/docx-file.js';
import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';

describe('DocxRenderer + DocxKit', () => {
  it('genera un .docx válido con encabezado, pie, tablas, formulario y firmas', async () => {
    const file = await DocxRenderer.render({
      title: 'Programa anual de auditoría',
      subtitle: 'Periodo 2026',
      organization: 'Organización de prueba',
      code: 'FO-PA-01',
      version: '2',
      generatedAt: new Date('2026-03-05T12:00:00Z'),
      fileName: 'Programa Anual 2026.docx',
      body: [
        DocxKit.heading('Datos generales'),
        DocxKit.keyValueTable([
          ['Periodo', '2026'],
          ['Responsable', 'Ana Gestora'],
        ]),
        DocxKit.heading('Calendario', 2),
        DocxKit.dataTable(['Área', 'Mes'], [['Compras', 'Marzo'], ['Producción', 'Mayo']], [2, 1]),
        DocxKit.heading('Registro'),
        DocxKit.fieldRow('Observaciones'),
        DocxKit.checkboxLine(['Conforme', 'No conforme', 'No aplica'], 'No conforme'),
        ...DocxKit.bullets(['Primero', 'Segundo']),
        ...DocxKit.numbered(['Uno', 'Dos']),
        DocxKit.note('Documento controlado.'),
        DocxKit.signatureBlock(['Gestor del programa', 'Alta dirección']),
      ],
    });

    const text = await DocxInspector.text(file.buffer);
    expect(file.buffer.subarray(0, 2).toString()).toBe('PK');
    expect(file.mimeType).toBe(DOCX_MIME);
    expect(file.fileName).toBe('Programa-Anual-2026.docx');
    expect(text).toContain('Programa anual de auditoría');
    expect(text).toContain('Periodo 2026');
    expect(text).toContain('Ana Gestora');
    expect(text).toContain('Compras');
    expect(text).toContain('☒ No conforme');
    expect(text).toContain('☐ Conforme');
    expect(text).toContain('Alta dirección');
    expect(await DocxInspector.headerText(file.buffer)).toContain('FO-PA-01');
  });

  it('muestra "Sin registros." en una tabla sin filas', async () => {
    const file = await DocxRenderer.render({
      title: 'Vacío',
      organization: 'Org',
      code: 'X',
      fileName: 'vacio',
      body: [DocxKit.dataTable(['A', 'B'], [])],
    });

    expect(await DocxInspector.text(file.buffer)).toContain('Sin registros.');
    expect(file.fileName).toBe('vacio.docx');
  });

  it('normaliza nombres de archivo con acentos y caracteres inseguros', () => {
    expect(DocxRenderer.safeFileName('Informe de Auditoría / 2026?')).toBe('Informe-de-Auditoria-2026.docx');
    expect(DocxRenderer.safeFileName('')).toBe('documento.docx');
  });
});

describe('DocxResponder', () => {
  it('fija los encabezados de descarga y devuelve un StreamableFile', async () => {
    const headers: Record<string, string> = {};
    const response = { set: (values: Record<string, string>) => Object.assign(headers, values) };
    const file = await DocxRenderer.render({ title: 'T', organization: 'O', code: 'C', fileName: 'a', body: [] });

    const stream = DocxResponder.stream(response as never, file);

    expect(headers['Content-Type']).toBe(DOCX_MIME);
    expect(headers['Content-Disposition']).toBe('attachment; filename="a.docx"');
    expect(headers['Content-Length']).toBe(String(file.buffer.length));
    expect(stream.getStream()).toBeDefined();
  });
});

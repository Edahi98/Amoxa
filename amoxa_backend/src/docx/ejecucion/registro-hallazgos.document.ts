import { DocxRenderer } from '@docx/docx-renderer.js';
import { DocxKit, type DocxBlock } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import type { HallazgoDoc, RegistroHallazgosData } from '@docx-ejecucion/ejecucion-documento-data.js';
import { EjecucionFormat } from '@docx-ejecucion/ejecucion-format.js';

export class RegistroHallazgosDocument {
  private static readonly ACCEPTANCE: Readonly<Record<HallazgoDoc['aceptacion'], string>> = {
    acepta: 'El dueño del proceso aceptó el hallazgo',
    discrepa: 'El dueño del proceso discrepó del hallazgo',
    pendiente: 'Sin respuesta del dueño del proceso',
  };

  public static async build(data: RegistroHallazgosData): Promise<DocxFile> {
    const body: DocxBlock[] = [
      DocxKit.heading('Datos de la auditoría'),
      DocxKit.keyValueTable(EjecucionFormat.auditoria(data.auditoria)),
      DocxKit.heading('Resumen'),
      DocxKit.keyValueTable([
        ['Hallazgos registrados', String(data.hallazgos.length)],
        ['No conformidades', String(data.hallazgos.filter((item) => item.tipo.startsWith('No conformidad')).length)],
      ]),
      DocxKit.heading('Hallazgos y no conformidades'),
      ...(data.hallazgos.length === 0
        ? [DocxKit.paragraph('La auditoría no registra hallazgos.', { italics: true, muted: true })]
        : data.hallazgos.flatMap((item) => RegistroHallazgosDocument.finding(item))),
      DocxKit.heading('Firmas'),
      DocxKit.signatureBlock(['Líder auditor', 'Dueño del proceso']),
    ];
    return DocxRenderer.render({
      title: 'Registro de hallazgos y no conformidades',
      subtitle: `Auditoría interna ISO 9001:2015 (9.2) · ${data.auditoria.titulo}`,
      organization: data.organizacion,
      code: 'AMX-EJE-RH',
      fileName: 'registro-de-hallazgos.docx',
      generatedAt: data.generadoEn,
      body,
    });
  }

  private static finding(item: HallazgoDoc): DocxBlock[] {
    return [
      DocxKit.heading(`Hallazgo ${item.numero}: ${item.tipo}`, 2),
      DocxKit.keyValueTable([
        ['Proceso', item.proceso],
        ['Cláusula incumplida', EjecucionFormat.text(item.clausula, 'No aplica')],
        ['Descripción', item.descripcion],
        ['Evidencias', `${item.evidencias} archivo(s), ${item.evidenciasVerificadas ? 'verificadas' : 'sin verificar'}`],
        ['Estado', item.estado],
        ['Aceptación del área', RegistroHallazgosDocument.ACCEPTANCE[item.aceptacion]],
        ['Motivo de la discrepancia', EjecucionFormat.text(item.motivoDiscrepancia, 'No aplica')],
      ]),
      DocxKit.spacer(),
    ];
  }
}

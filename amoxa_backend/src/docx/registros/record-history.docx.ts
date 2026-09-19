import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { DocxFile } from '@docx/docx-file.js';

export interface RecordHistoryVersion {
  version: number;
  autor: string;
  fecha: Date;
  hash: string | null;
  confidencialidad: string;
}

export interface RecordHistoryDocumentData {
  organizacion: string;
  generadoEn: Date;
  entidadTipo: string;
  entidadId: string;
  versiones: RecordHistoryVersion[];
}

export class RecordHistoryDocx {
  public static async build(data: RecordHistoryDocumentData): Promise<DocxFile> {
    return DocxRenderer.render({
      title: 'Historial de versiones del registro',
      subtitle: `${data.entidadTipo} · ${data.entidadId}`,
      organization: data.organizacion,
      code: 'AMX-REG-HIS',
      generatedAt: data.generadoEn,
      fileName: `historial-${data.entidadTipo}-${data.entidadId}`,
      body: [
        DocxKit.heading('1. Registro'),
        DocxKit.keyValueTable([
          ['Tipo de registro', data.entidadTipo],
          ['Identificador', data.entidadId],
          ['Versiones conservadas', String(data.versiones.length)],
        ]),
        DocxKit.heading('2. Versiones'),
        DocxKit.dataTable(
          ['Versión', 'Autor', 'Fecha', 'Huella (SHA-256)', 'Confidencialidad'],
          data.versiones.map((item) => [
            String(item.version),
            item.autor,
            DocxRenderer.formatDate(item.fecha),
            item.hash ?? 'Sin huella',
            item.confidencialidad,
          ]),
          [1, 3, 3, 8, 2.5],
        ),
        DocxKit.note('Cada cambio crea una versión nueva con su autor y fecha. Ninguna versión se borra ni se modifica.'),
      ],
    });
  }
}

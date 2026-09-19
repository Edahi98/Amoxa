import type { DocxFile } from '@docx/docx-file.js';
import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { PlantillaView } from '@plantillas-mappers-plantilla/plantilla-view.js';

export interface ListaVerificacionData {
  organizacion: string;
  plantilla: PlantillaView;
  generadoEn?: Date;
}

export class ListaVerificacionDocument {
  public static async build(data: ListaVerificacionData): Promise<DocxFile> {
    const { plantilla } = data;
    return DocxRenderer.render({
      title: 'Lista de verificación',
      subtitle: `${plantilla.nombre} · versión ${plantilla.version}`,
      organization: data.organizacion,
      code: 'AMX-LV-01',
      version: String(plantilla.version),
      generatedAt: data.generadoEn,
      fileName: `lista-verificacion-${plantilla.nombre}-v${plantilla.version}`,
      body: [
        DocxKit.heading('Datos de la auditoría'),
        DocxKit.fieldRow('Auditoría / programa'),
        DocxKit.fieldRow('Proceso o área auditada'),
        DocxKit.fieldRow('Fecha de la auditoría'),
        DocxKit.fieldRow('Auditor'),
        DocxKit.fieldRow('Persona entrevistada'),
        DocxKit.heading('Preguntas'),
        ...ListaVerificacionDocument.questions(plantilla),
        DocxKit.heading('Firmas'),
        DocxKit.spacer(120),
        DocxKit.signatureBlock(['Auditor', 'Líder de auditoría', 'Responsable del proceso']),
      ],
    });
  }

  private static questions(plantilla: PlantillaView) {
    if (plantilla.preguntas.length === 0) {
      return [DocxKit.paragraph('La plantilla todavía no tiene preguntas.', { italics: true, muted: true })];
    }
    return plantilla.preguntas.flatMap((question) => [
      DocxKit.paragraph(`${question.orden}. ${question.texto}`, { bold: true }),
      DocxKit.paragraph(`Cláusula: ${question.clausula ?? 'sin indicar'} · Tipo de criterio: ${question.criterio_etiqueta}`, {
        muted: true,
      }),
      DocxKit.checkboxLine(['Conforme', 'No conforme', 'No aplica']),
      DocxKit.fieldRow('Comentario / evidencia'),
      DocxKit.spacer(160),
    ]);
  }
}

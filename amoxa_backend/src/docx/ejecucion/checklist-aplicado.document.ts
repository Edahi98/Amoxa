import { DocxRenderer } from '@docx/docx-renderer.js';
import { DocxKit, type DocxBlock } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import type { ChecklistAplicadoData, PreguntaAplicadaDoc } from '@docx-ejecucion/ejecucion-documento-data.js';
import { EjecucionFormat } from '@docx-ejecucion/ejecucion-format.js';

export class ChecklistAplicadoDocument {
  private static readonly OPTIONS = ['Conforme', 'No conforme', 'No aplica'] as const;

  private static readonly SELECTED: Readonly<Record<'C' | 'NC' | 'NA', string>> = {
    C: 'Conforme',
    NC: 'No conforme',
    NA: 'No aplica',
  };

  public static async build(data: ChecklistAplicadoData): Promise<DocxFile> {
    const body: DocxBlock[] = [
      DocxKit.heading('Datos de la auditoría'),
      DocxKit.keyValueTable([
        ...EjecucionFormat.auditoria(data.auditoria),
        ['Plantilla de checklist', data.plantilla],
        ['Avance', `${data.progreso.respondidas} de ${data.progreso.total} preguntas respondidas (${data.progreso.avance}%)`],
      ]),
      DocxKit.heading('Preguntas y resultados'),
      ...data.preguntas.flatMap((pregunta) => ChecklistAplicadoDocument.question(pregunta)),
      DocxKit.heading('Firmas'),
      DocxKit.paragraph(`Auditores participantes: ${data.auditores.length === 0 ? 'Sin registro' : data.auditores.join(', ')}.`),
      DocxKit.spacer(),
      DocxKit.signatureBlock(['Auditor', 'Líder auditor']),
    ];
    return DocxRenderer.render({
      title: 'Lista de verificación aplicada',
      subtitle: `Auditoría interna ISO 9001:2015 (9.2) · ${data.auditoria.titulo}`,
      organization: data.organizacion,
      code: 'AMX-EJE-LV',
      fileName: 'lista-de-verificacion-aplicada.docx',
      generatedAt: data.generadoEn,
      body,
    });
  }

  private static question(pregunta: PreguntaAplicadaDoc): DocxBlock[] {
    return [
      DocxKit.heading(`${pregunta.orden}. ${pregunta.texto}`, 2),
      DocxKit.keyValueTable([
        ['Cláusula', EjecucionFormat.text(pregunta.clausula, 'Sin cláusula')],
        ['Criterio', pregunta.criterio],
        ['Evidencia verificada', pregunta.verificada ? 'Sí' : 'No'],
      ]),
      DocxKit.spacer(60),
      DocxKit.checkboxLine(
        [...ChecklistAplicadoDocument.OPTIONS],
        pregunta.resultado === null ? undefined : ChecklistAplicadoDocument.SELECTED[pregunta.resultado],
      ),
      DocxKit.paragraph(`Comentarios: ${EjecucionFormat.text(pregunta.comentario)}`),
      DocxKit.dataTable(
        ['Evidencia', 'Fecha de captura', 'Ubicación', 'Huella SHA-256'],
        pregunta.evidencias.map((evidencia) => [
          evidencia.nombre,
          EjecucionFormat.dateTime(evidencia.capturadoEn),
          EjecucionFormat.text(evidencia.ubicacion, 'Sin ubicación'),
          EjecucionFormat.text(evidencia.sha256, 'Sin huella'),
        ]),
        [3, 2, 2, 5],
      ),
      DocxKit.spacer(),
    ];
  }
}

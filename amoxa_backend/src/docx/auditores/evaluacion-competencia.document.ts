import type { DocxFile } from '@docx/docx-file.js';
import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { EvaluacionView } from '@auditores-mappers-auditor/auditor-view.js';

export interface EvaluacionCompetenciaData {
  organizacion: string;
  auditorNombre: string;
  evaluacion: EvaluacionView;
  generadoEn?: Date;
}

export class EvaluacionCompetenciaDocument {
  public static async build(data: EvaluacionCompetenciaData): Promise<DocxFile> {
    const { evaluacion } = data;
    return DocxRenderer.render({
      title: 'Registro de evaluación de competencia',
      subtitle: data.auditorNombre,
      organization: data.organizacion,
      code: 'AMX-EC-01',
      generatedAt: data.generadoEn,
      fileName: `evaluacion-competencia-${data.auditorNombre}-${evaluacion.fecha}`,
      body: [
        DocxKit.heading('Datos de la evaluación'),
        DocxKit.keyValueTable([
          ['Auditor evaluado', data.auditorNombre],
          ['Fecha de la evaluación', evaluacion.fecha],
          ['Evaluador', evaluacion.evaluador],
        ]),
        DocxKit.heading('Métodos de evaluación aplicados'),
        ...DocxKit.bullets(evaluacion.metodos_etiquetas),
        DocxKit.heading('Resultado'),
        DocxKit.keyValueTable([
          ['Resultado', evaluacion.resultado_etiqueta],
          ['Observaciones', evaluacion.observaciones ?? 'Sin observaciones'],
        ]),
        DocxKit.heading('Aptitud y vigencia'),
        DocxKit.keyValueTable([
          ['Estado del auditor', evaluacion.estado_resultante],
          ['Aptitud', evaluacion.apto],
          ['Vigente hasta', evaluacion.vigencia_hasta ?? 'Sin vigencia'],
        ]),
        DocxKit.spacer(240),
        DocxKit.signatureBlock(['Auditor evaluado', 'Evaluador (gestor del programa)']),
      ],
    });
  }
}

import type { DocxFile } from '@docx/docx-file.js';
import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { AuditorView } from '@auditores-mappers-auditor/auditor-view.js';

export interface FichaAuditorData {
  organizacion: string;
  auditor: AuditorView;
  generadoEn?: Date;
}

export class FichaAuditorDocument {
  public static async build(data: FichaAuditorData): Promise<DocxFile> {
    const { auditor } = data;
    return DocxRenderer.render({
      title: 'Ficha de auditor',
      subtitle: auditor.nombre,
      organization: data.organizacion,
      code: 'AMX-FA-01',
      generatedAt: data.generadoEn,
      fileName: `ficha-auditor-${auditor.nombre}`,
      body: [
        DocxKit.heading('Datos generales'),
        DocxKit.keyValueTable([
          ['Nombre', auditor.nombre],
          ['Correo', auditor.email],
          ['Rol en la organización', auditor.rol],
        ]),
        DocxKit.heading('Formación'),
        DocxKit.paragraph(auditor.formacion ?? 'Sin registrar.'),
        DocxKit.heading('Experiencia en auditoría'),
        DocxKit.paragraph(auditor.experiencia ?? 'Sin registrar.'),
        DocxKit.heading('Procesos y normas de especialidad'),
        ...(auditor.disciplinas.length > 0 ? DocxKit.bullets(auditor.disciplinas) : [DocxKit.paragraph('Sin registrar.')]),
        DocxKit.heading('Competencia y vigencia'),
        DocxKit.keyValueTable([
          ['Estado', auditor.estado_etiqueta],
          ['Aptitud', auditor.apto],
          ['Vigente hasta', auditor.vigencia_hasta ?? 'Sin vigencia'],
        ]),
        DocxKit.heading('Historial de evaluaciones', 2),
        DocxKit.dataTable(
          ['Fecha', 'Métodos aplicados', 'Resultado', 'Evaluador', 'Aptitud'],
          auditor.evaluaciones.map((evaluation) => [
            evaluation.fecha,
            evaluation.metodos_etiquetas.join(', '),
            evaluation.resultado_etiqueta,
            evaluation.evaluador,
            evaluation.apto,
          ]),
          [2, 4, 2, 3, 3],
        ),
        DocxKit.spacer(240),
        DocxKit.signatureBlock(['Auditor', 'Gestor del programa']),
      ],
    });
  }
}

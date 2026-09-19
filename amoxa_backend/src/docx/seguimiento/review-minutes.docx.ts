import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { DocxFile } from '@docx/docx-file.js';
import type { Indicators } from '@seguimiento-indicadores-indicator/indicator.types.js';
import type { LessonEntry, ProgramSummary, ReviewEvent } from '@seguimiento-revision/revision.types.js';

export interface ReviewMinutesData {
  organizacion: string;
  generadoEn: Date;
  programa: ProgramSummary;
  resumen: string;
  indicadores: Indicators;
  presentaciones: ReviewEvent[];
  decisiones: ReviewEvent[];
  lecciones: LessonEntry[];
}

export class ReviewMinutesDocx {
  public static async build(data: ReviewMinutesData): Promise<DocxFile> {
    const { indicadores } = data;
    return DocxRenderer.render({
      title: 'Acta de revisión por la dirección',
      subtitle: `ISO 9001:2015, cláusula 9.3 · Programa de auditoría ${data.programa.periodo}`,
      organization: data.organizacion,
      code: 'AMX-SEG-REV',
      version: String(data.programa.version),
      generatedAt: data.generadoEn,
      fileName: `acta-revision-direccion-${data.programa.periodo}`,
      body: [
        DocxKit.heading('1. Entradas de la revisión'),
        DocxKit.keyValueTable([
          ['Periodo del programa', data.programa.periodo],
          ['Estado del programa', data.programa.estado],
          ['Cumplimiento del calendario', `${indicadores.cumplimiento_calendario}%`],
          ['Auditorías realizadas / planificadas', `${indicadores.auditorias_realizadas} / ${indicadores.auditorias_planificadas}`],
          ['Incumplimientos registrados', String(indicadores.incumplimientos_totales)],
          ['Hallazgos abiertos', String(indicadores.hallazgos_abiertos)],
          ['Acciones atrasadas', String(indicadores.acciones_atrasadas)],
        ]),
        DocxKit.spacer(),
        ...data.resumen.split('\n').map((line) => DocxKit.paragraph(line)),
        DocxKit.heading('2. Resultados de la presentación'),
        DocxKit.dataTable(
          ['Fecha', 'Presentado por'],
          data.presentaciones.map((item) => [DocxRenderer.formatDate(item.creadaEn), item.autor]),
          [2, 3],
        ),
        DocxKit.heading('3. Decisiones y recursos asignados'),
        DocxKit.dataTable(
          ['Fecha', 'Decidido por', 'Decisiones', 'Recursos asignados'],
          data.decisiones.map((item) => [
            DocxRenderer.formatDate(item.creadaEn),
            item.autor,
            item.decisiones ?? '',
            item.recursos ?? 'Sin recursos indicados',
          ]),
          [2, 2, 5, 4],
        ),
        DocxKit.heading('4. Lecciones aprendidas'),
        ...(data.lecciones.length === 0
          ? [DocxKit.paragraph('Aún no se registran lecciones aprendidas.', { italics: true, muted: true })]
          : DocxKit.bullets(data.lecciones.map((item) => `${item.texto} (${item.autor}, ${DocxRenderer.formatDate(item.creadaEn)})`))),
        DocxKit.heading('5. Firmas'),
        DocxKit.signatureBlock(['Alta dirección', 'Gestor del programa']),
        DocxKit.note('Los registros de esta revisión se conservan versionados; nada se borra.'),
      ],
    });
  }
}

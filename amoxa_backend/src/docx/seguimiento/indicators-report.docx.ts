import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { DocxFile } from '@docx/docx-file.js';
import type { Indicators } from '@seguimiento-indicadores-indicator/indicator.types.js';

export interface IndicatorsReportData {
  organizacion: string;
  periodo: string;
  area: string;
  generadoEn: Date;
  indicadores: Indicators;
}

export class IndicatorsReportDocx {
  public static async build(data: IndicatorsReportData): Promise<DocxFile> {
    const { indicadores } = data;
    return DocxRenderer.render({
      title: 'Reporte de indicadores del programa',
      subtitle: `Periodo: ${data.periodo} · Área: ${data.area}`,
      organization: data.organizacion,
      code: 'AMX-SEG-IND',
      generatedAt: data.generadoEn,
      fileName: `reporte-indicadores-${data.periodo}`,
      body: [
        DocxKit.heading('1. Indicadores clave'),
        DocxKit.keyValueTable([
          ['Auditorías realizadas', String(indicadores.auditorias_realizadas)],
          ['Auditorías planificadas', String(indicadores.auditorias_planificadas)],
          ['Cumplimiento del calendario', `${indicadores.cumplimiento_calendario}%`],
          ['Incumplimientos (no conformidades)', String(indicadores.incumplimientos_totales)],
          ['Hallazgos abiertos', String(indicadores.hallazgos_abiertos)],
          ['Acciones atrasadas', String(indicadores.acciones_atrasadas)],
        ]),
        DocxKit.heading('2. Cumplimiento del calendario'),
        DocxKit.dataTable(
          ['Concepto', 'Auditorías'],
          [
            ['Planificadas', String(indicadores.calendario.planificadas)],
            ['Realizadas', String(indicadores.calendario.realizadas)],
            ['En curso', String(indicadores.calendario.en_curso)],
            ['Canceladas', String(indicadores.calendario.canceladas)],
          ],
          [3, 1],
        ),
        DocxKit.heading('3. Incumplimientos por área'),
        DocxKit.dataTable(
          ['Área', 'Incumplimientos'],
          IndicatorsReportDocx.rows(indicadores.incumplimientos_por_area),
          [3, 1],
        ),
        DocxKit.heading('4. Acciones atrasadas'),
        DocxKit.dataTable(
          ['Acción', 'Área', 'Responsable', 'Fecha límite', 'Estado'],
          indicadores.acciones_atrasadas_detalle.map((row) => [
            row.descripcion,
            row.area,
            row.responsable,
            row.fechaLimite ?? 'Sin fecha',
            row.estado,
          ]),
          [4, 2, 2, 2, 1.5],
        ),
        DocxKit.note('Reporte de solo lectura generado a partir de los registros vigentes del sistema.'),
      ],
    });
  }

  private static rows(series: Indicators['incumplimientos_por_area']): string[][] {
    return series.labels.map((label, index) => [label, String(series.datasets[0]?.data[index] ?? 0)]);
  }
}

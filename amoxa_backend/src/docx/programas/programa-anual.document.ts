import type { DocxFile } from '@docx/docx-file.js';
import { DocxKit } from '@docx/docx-kit.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { CalendarEventView } from '@programas-rules-programa/programa-calendar.js';
import type { ProgramaView } from '@programas-mappers-programa/programa-view.js';

export interface ProgramaAnualData {
  organizacion: string;
  programa: ProgramaView;
  calendario: readonly CalendarEventView[];
  generadoEn?: Date;
}

export class ProgramaAnualDocument {
  public static async build(data: ProgramaAnualData): Promise<DocxFile> {
    const { programa } = data;
    return DocxRenderer.render({
      title: 'Programa anual de auditoría',
      subtitle: `Periodo ${programa.periodo}`,
      organization: data.organizacion,
      code: 'AMX-PAA-01',
      version: String(programa.version),
      generatedAt: data.generadoEn,
      fileName: `programa-anual-auditoria-${programa.periodo}`,
      body: [
        DocxKit.heading('Datos generales'),
        DocxKit.keyValueTable([
          ['Organización', data.organizacion],
          ['Periodo', programa.periodo],
          ['Estado', programa.estado_etiqueta],
          ['Inicio del calendario', ProgramaAnualDocument.date(programa.fecha_inicio)],
          ['Fin del calendario', ProgramaAnualDocument.date(programa.fecha_fin)],
          ['Frecuencia', programa.frecuencia ?? 'Sin definir'],
          ['Métodos de auditoría', programa.metodos ?? 'Sin definir'],
          ['Elaborado por', programa.creado_por ?? 'Sin registro'],
        ]),
        DocxKit.heading('Objetivos'),
        DocxKit.paragraph(programa.objetivos ?? 'Sin definir.'),
        DocxKit.heading('Riesgos y oportunidades'),
        DocxKit.paragraph(programa.riesgos ?? 'Sin definir.'),
        DocxKit.heading('Prioridades de auditoría'),
        DocxKit.dataTable(
          ['Orden', 'Proceso', 'Importancia', 'Puntaje sugerido'],
          programa.procesos.map((process) => [
            String(process.orden),
            process.nombre,
            process.importancia,
            String(process.puntaje_sugerido),
          ]),
          [1, 4, 2, 2],
        ),
        ...ProgramaAnualDocument.justification(programa),
        DocxKit.heading('Calendario'),
        DocxKit.dataTable(
          ['Fecha', 'Actividad', 'Estado'],
          data.calendario.map((event) => [ProgramaAnualDocument.date(event.date), event.title, event.status ?? '']),
          [2, 5, 2],
        ),
        DocxKit.heading('Estado y constancia de aprobación'),
        DocxKit.keyValueTable([
          ['Estado del programa', programa.estado_etiqueta],
          ['Enviado a aprobación', ProgramaAnualDocument.stamp(programa.enviado_en)],
          ['Aprobado por', programa.aprobado_por ?? 'Pendiente'],
          ['Fecha y hora de aprobación', ProgramaAnualDocument.stamp(programa.aprobado_en)],
          ...(programa.motivo_devolucion === null ? [] : ([['Motivo de la devolución', programa.motivo_devolucion]] as [string, string][])),
        ]),
        DocxKit.spacer(240),
        DocxKit.signatureBlock(['Gestor del programa', 'Alta dirección']),
      ],
    });
  }

  private static justification(programa: ProgramaView) {
    if (!programa.prioridad_modificada) {
      return [];
    }
    return [
      DocxKit.heading('Justificación del cambio de prioridad', 2),
      DocxKit.paragraph(programa.justificacion_prioridad ?? 'Sin justificación registrada.'),
    ];
  }

  private static date(value: string | null): string {
    return value === null ? 'Sin definir' : DocxRenderer.formatDate(new Date(`${value.slice(0, 10)}T00:00:00Z`));
  }

  private static stamp(value: string | null): string {
    return value === null ? 'Sin registro' : `${DocxRenderer.formatDate(new Date(value))} ${value.slice(11, 16)} UTC`;
  }
}

import { DocxRenderer } from '@docx/docx-renderer.js';
import { DocxKit, type DocxBlock } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import type { ActaReunionData, HallazgoDoc } from '@docx-ejecucion/ejecucion-documento-data.js';
import { EjecucionFormat } from '@docx-ejecucion/ejecucion-format.js';

export class ActaReunionDocument {
  private static readonly ACCEPTANCE: Readonly<Record<HallazgoDoc['aceptacion'], string>> = {
    acepta: 'Aceptó',
    discrepa: 'Discrepó',
    pendiente: 'Sin respuesta',
  };

  private static readonly AREA_RESULT: Readonly<Record<'aceptado' | 'discrepa', string>> = {
    aceptado: 'El área aceptó',
    discrepa: 'El área discrepó',
  };

  public static async build(data: ActaReunionData): Promise<DocxFile> {
    const label = data.tipo === 'apertura' ? 'apertura' : 'cierre';
    const body: DocxBlock[] = [
      DocxKit.heading('Datos de la auditoría'),
      DocxKit.keyValueTable(EjecucionFormat.auditoria(data.auditoria)),
      DocxKit.heading('Datos de la reunión'),
      DocxKit.keyValueTable([
        ['Estado del registro', data.registrada ? 'Reunión registrada' : 'Reunión aún no registrada'],
        ['Preside', EjecucionFormat.text(data.dirigidaPor, 'Sin registro')],
        ['Fecha y hora', EjecucionFormat.dateTime(data.realizadaEn)],
      ]),
      DocxKit.heading('Asistentes'),
      DocxKit.dataTable(
        ['Nombre', 'Rol', 'Participación', 'Asistencia confirmada', 'Firma'],
        data.asistentes.map((asistente) => [
          asistente.nombre,
          asistente.rol,
          asistente.rolReunion === 'preside' ? 'Preside' : 'Asiste',
          EjecucionFormat.dateTime(asistente.confirmadaEn),
          '',
        ]),
        [3, 2, 2, 3, 3],
      ),
      DocxKit.heading('Notas y acuerdos'),
      DocxKit.paragraph(EjecucionFormat.text(data.notas, 'Sin notas registradas.')),
      ...(data.tipo === 'cierre' ? ActaReunionDocument.findings(data.hallazgos) : []),
      DocxKit.heading('Firmas'),
      DocxKit.signatureBlock(['Líder auditor', 'Auditor', 'Dueño del proceso']),
    ];
    return DocxRenderer.render({
      title: `Acta de reunión de ${label}`,
      subtitle: `Auditoría interna ISO 9001:2015 (9.2) · ${data.auditoria.titulo}`,
      organization: data.organizacion,
      code: data.tipo === 'apertura' ? 'AMX-EJE-AR' : 'AMX-EJE-CR',
      fileName: `acta-reunion-${label}.docx`,
      generatedAt: data.generadoEn,
      body,
    });
  }

  private static findings(hallazgos: readonly HallazgoDoc[]): DocxBlock[] {
    return [
      DocxKit.heading('Hallazgos revisados'),
      DocxKit.dataTable(
        ['N.º', 'Hallazgo', 'Revisión con el área', 'Aceptación del dueño del proceso', 'Motivo de discrepancia'],
        hallazgos.map((item) => [
          String(item.numero),
          `${item.tipo} (${item.proceso})\n${item.descripcion}`,
          item.revisionArea === null
            ? 'Sin revisar'
            : `${ActaReunionDocument.AREA_RESULT[item.revisionArea]}\n${EjecucionFormat.text(item.comentarioRevision, '')}`.trim(),
          ActaReunionDocument.ACCEPTANCE[item.aceptacion],
          EjecucionFormat.text(item.motivoDiscrepancia, 'No aplica'),
        ]),
        [1, 5, 3, 3, 3],
      ),
    ];
  }
}

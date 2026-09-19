import { DocxKit, type DocxBlock } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { AuditNotificationDocumentData } from '@docx-auditorias/audit-document-data.js';

export class AuditNotificationDocument {
  public static async build(data: AuditNotificationDocumentData): Promise<DocxFile> {
    const issued = DocxRenderer.formatDate(data.generatedAt ?? new Date());
    const body: DocxBlock[] = [
      DocxKit.paragraph(`Fecha de emisión: ${issued}`, { align: 'right' }),
      DocxKit.paragraph(`A: Responsables de los procesos ${data.procesos.length > 0 ? data.procesos.join(', ') : 'auditados'}`, {
        bold: true,
      }),
      DocxKit.paragraph(`De: ${data.lider}, líder de auditoría`),
      DocxKit.paragraph(`Asunto: Convocatoria a auditoría interna, programa ${data.periodo}`, { bold: true }),
      DocxKit.spacer(120),
      DocxKit.paragraph(
        `Por medio de la presente se les convoca a la auditoría interna del sistema de gestión de la calidad conforme a ISO 9001:2015, cláusula 9.2, que se realizará ${AuditNotificationDocument.period(data)}, bajo la modalidad ${data.metodo.toLowerCase()}.`,
      ),
      ...(data.objetivo === null ? [] : [DocxKit.heading('Objetivo'), DocxKit.paragraph(data.objetivo)]),
      DocxKit.heading('Alcance'),
      ...(data.procesos.length > 0 ? DocxKit.bullets(data.procesos) : [DocxKit.paragraph('Por definir.', { muted: true })]),
      DocxKit.heading('Criterios de auditoría'),
      ...(data.criterios.length > 0 ? DocxKit.bullets(data.criterios) : [DocxKit.paragraph('Por definir.', { muted: true })]),
      DocxKit.heading('Equipo auditor'),
      DocxKit.dataTable(
        ['Nombre', 'Rol'],
        [[data.lider, 'Líder de auditoría'], ...data.equipo.map((member) => [member.nombre, member.rol])],
        [3, 2],
      ),
      DocxKit.spacer(120),
      DocxKit.paragraph(
        'Se solicita confirmar que el área cuenta con la información, la cooperación y el tiempo necesarios, y responder a esta convocatoria a través de Amoxa o directamente con el líder de auditoría.',
      ),
      DocxKit.spacer(240),
      DocxKit.signatureBlock(['Líder de auditoría', 'Recibido por el área auditada']),
    ];
    return DocxRenderer.render({
      title: 'Notificación de auditoría',
      subtitle: `Convocatoria al área auditada · ${data.periodo}`,
      organization: data.organizacion,
      code: 'AMX-AUD-NOT',
      fileName: `notificacion-auditoria-${data.auditoriaId.slice(0, 8)}`,
      generatedAt: data.generatedAt,
      body,
    });
  }

  private static period(data: AuditNotificationDocumentData): string {
    if (data.fechaInicio === null) return 'en la fecha que se acuerde con el líder de auditoría';
    if (data.fechaFin === null || data.fechaFin === data.fechaInicio) return `el ${data.fechaInicio}`;
    return `del ${data.fechaInicio} al ${data.fechaFin}`;
  }
}

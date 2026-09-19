import { DocxKit, type DocxBlock } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { AuditPlanDocumentData } from '@docx-auditorias/audit-document-data.js';

export class AuditPlanDocument {
  public static async build(data: AuditPlanDocumentData): Promise<DocxFile> {
    const body: DocxBlock[] = [
      DocxKit.keyValueTable([
        ['Auditoría', data.auditoriaId],
        ['Programa', data.periodo],
        ['Líder de auditoría', data.lider],
        ['Método', data.metodo],
        ['Plantilla de checklist', data.plantilla],
        ['Estado de aprobación', data.estadoPlan],
      ]),
      DocxKit.heading('Objetivo'),
      DocxKit.paragraph(
        data.objetivo ?? 'Verificar la conformidad y eficacia del sistema de gestión de la calidad en los procesos auditados.',
      ),
      DocxKit.heading('Alcance'),
      ...(data.procesos.length > 0 ? DocxKit.bullets(data.procesos) : [DocxKit.paragraph('Sin procesos definidos.', { muted: true })]),
      DocxKit.heading('Criterios de auditoría'),
      ...(data.criterios.length > 0 ? DocxKit.bullets(data.criterios) : [DocxKit.paragraph('Sin criterios definidos.', { muted: true })]),
      DocxKit.heading('Método'),
      DocxKit.paragraph(data.metodo),
      DocxKit.heading('Equipo auditor'),
      DocxKit.dataTable(
        ['Nombre', 'Rol', 'Correo'],
        [[data.lider, 'Líder de auditoría', ''], ...data.equipo.map((member) => [member.nombre, member.rol, member.email])],
        [3, 2, 3],
      ),
      DocxKit.heading('Fechas'),
      DocxKit.keyValueTable([
        ['Inicio', data.fechaInicio ?? 'Por definir'],
        ['Fin', data.fechaFin ?? 'Por definir'],
      ]),
      DocxKit.heading('Agenda'),
      DocxKit.dataTable(
        ['Fecha', 'Actividad'],
        data.agenda.map((row) => [row.fecha ?? 'Sin fecha', row.actividad]),
        [1, 4],
      ),
      DocxKit.heading('Tareas por auditor'),
      ...(data.tareas.length > 0
        ? data.tareas.flatMap((group) => [DocxKit.heading(group.auditor, 2), ...DocxKit.bullets(group.tareas)])
        : [DocxKit.paragraph('Sin tareas repartidas.', { muted: true })]),
      DocxKit.heading('Aprobación del plan'),
      DocxKit.paragraph(
        data.aprobadoEn === null
          ? `Estado: ${data.estadoPlan}.`
          : `Estado: ${data.estadoPlan}. Aprobado por el área auditada el ${data.aprobadoEn}.`,
      ),
      DocxKit.spacer(240),
      DocxKit.signatureBlock(['Líder de auditoría', 'Responsable del área auditada', 'Gestor del programa']),
    ];
    return DocxRenderer.render({
      title: 'Plan de auditoría',
      subtitle: `Auditoría interna · ${data.periodo}`,
      organization: data.organizacion,
      code: 'AMX-AUD-PLAN',
      version: String(data.planVersion),
      fileName: `plan-auditoria-${data.auditoriaId.slice(0, 8)}`,
      generatedAt: data.generatedAt,
      body,
    });
  }
}

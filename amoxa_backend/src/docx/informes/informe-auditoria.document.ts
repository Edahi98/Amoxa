import type { DocxBrand } from '@docx/docx-brand.js';
import { DocxKit } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';
import { InformeContentBuilder } from '@informes-rules-informe/informe-content-builder.js';

export class InformeAuditoriaDocument {
  private static readonly ESTADOS: Record<string, string> = {
    borrador: 'Borrador',
    firmado: 'Firmado',
    distribuido: 'Distribuido',
  };

  public static async build(data: InformeDetalle, brand?: DocxBrand): Promise<DocxFile> {
    const accent = brand?.color;
    return DocxRenderer.render({
      title: 'Informe de auditoría interna',
      subtitle: `Período ${data.periodo} · ISO 9001:2015 cláusula 9.2 e ISO 19011`,
      organization: data.organizacionNombre,
      code: 'AMX-INF-01',
      fileName: `informe-auditoria-${data.periodo}`,
      brand,
      body: [
        DocxKit.heading('Datos de la auditoría', 1, accent),
        DocxKit.keyValueTable([
          ['Organización', data.organizacionNombre],
          ['Período del programa', data.periodo],
          ['Método', data.metodo],
          ['Fecha planificada', data.fechaPlan ?? 'Sin fecha'],
          ['Fecha de realización', data.fechaReal ?? 'Sin fecha'],
          ['Líder auditor', data.liderNombre],
          ['Estado del informe', InformeAuditoriaDocument.ESTADOS[data.estado] ?? data.estado],
          ['Fecha de emisión', data.fechaEmision ?? 'Pendiente'],
          ['Grado de conformidad', data.gradoConformidad ?? InformeContentBuilder.conformity(data.hallazgos)],
        ]),
        DocxKit.heading('Objetivo', 1, accent),
        DocxKit.paragraph(data.objetivos ?? 'No se definió un objetivo específico.'),
        DocxKit.heading('Alcance', 1, accent),
        ...(data.procesos.length === 0 ? [DocxKit.paragraph('Sin procesos definidos.')] : DocxKit.bullets(data.procesos)),
        DocxKit.heading('Criterios de auditoría', 1, accent),
        ...(data.criterios.length === 0 ? [DocxKit.paragraph('Sin criterios definidos.')] : DocxKit.bullets(data.criterios)),
        DocxKit.heading('Equipo auditor', 1, accent),
        DocxKit.dataTable(
          ['Nombre', 'Rol en el equipo'],
          data.equipo.map((member) => [member.nombre, member.rol]),
        ),
        DocxKit.heading('Resumen ejecutivo', 1, accent),
        DocxKit.paragraph(InformeContentBuilder.summary(data.procesos, data.hallazgos)),
        DocxKit.heading('Conclusiones de la auditoría', 1, accent),
        DocxKit.paragraph(data.conclusiones ?? 'Sin conclusiones registradas.'),
        DocxKit.heading('Declaración sobre el muestreo', 1, accent),
        DocxKit.paragraph(data.declaracionMuestreo ?? InformeContentBuilder.SAMPLING_STATEMENT),
        DocxKit.heading('Hallazgos', 1, accent),
        DocxKit.dataTable(
          ['#', 'Proceso', 'Clasificación', 'Cláusula', 'Descripción', 'Estado'],
          data.hallazgos.map((hallazgo, index) => [
            String(index + 1),
            hallazgo.proceso,
            InformeContentBuilder.kindLabel(hallazgo),
            hallazgo.criterio ?? '-',
            hallazgo.descripcion,
            hallazgo.estado,
          ]),
          [0.4, 1.4, 1.4, 0.9, 3, 1],
        ),
        DocxKit.heading('Acciones correctivas asociadas', 1, accent),
        DocxKit.dataTable(
          ['Acción', 'Causa raíz', 'Responsable', 'Fecha límite', 'Estado'],
          data.acciones.map((action) => [
            action.descripcion,
            action.causaRaiz ?? '-',
            action.responsable,
            action.fechaLimite ?? '-',
            action.estado,
          ]),
          [2.5, 2, 1.4, 1.1, 1],
        ),
        DocxKit.heading('Distribución', 1, accent),
        DocxKit.dataTable(
          ['Destinatario', 'Rol', 'Fecha de envío', 'Lectura'],
          data.distribucion.map((item) => [item.nombre, item.rol, item.fechaEnvio.slice(0, 10), item.leidoEn ? item.leidoEn.slice(0, 10) : 'Pendiente']),
        ),
        DocxKit.heading('Firmas', 1, accent),
        DocxKit.paragraph(
          data.firma === null
            ? 'El informe aún no está firmado.'
            : `Firmado por ${data.firma.firmanteNombre} el ${data.firma.firmadoEn.slice(0, 10)}. Huella del contenido: ${data.firma.huella}`,
        ),
        DocxKit.spacer(),
        DocxKit.signatureBlock(['Líder auditor', 'Alta dirección']),
        DocxKit.note(
          'Este informe documenta los resultados de la auditoría interna conforme a la cláusula 9.2.2 d) de ISO 9001:2015: los resultados se informan a la dirección pertinente y se conserva información documentada como evidencia.',
        ),
      ],
    });
  }
}

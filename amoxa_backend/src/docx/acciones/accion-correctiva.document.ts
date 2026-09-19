import { DocxKit } from '@docx/docx-kit.js';
import type { DocxFile } from '@docx/docx-file.js';
import { DocxRenderer } from '@docx/docx-renderer.js';
import type { AccionDetalle } from '@acciones-rules-accion/accion-detalle.types.js';

export class AccionCorrectivaDocument {
  public static async build(data: AccionDetalle): Promise<DocxFile> {
    const lastVerification = data.verificaciones.at(-1);
    const closureEvidence = data.evidencias.filter((item) => item.etapa === 'cierre');
    const verificationEvidence = data.evidencias.filter((item) => item.etapa === 'verificacion');
    const label = (item: { nombre: string | null; url: string | null }): string => item.nombre ?? item.url ?? 'Evidencia';
    const selected = lastVerification === undefined ? undefined : lastVerification.eficaz ? 'Eficaz' : 'No eficaz';

    return DocxRenderer.render({
      title: 'Formulario de acción correctiva',
      subtitle: 'ISO 9001:2015 cláusula 10.2 · acción sobre la no conformidad detectada en la auditoría interna',
      organization: data.organizacionNombre,
      code: 'AMX-ACC-01',
      fileName: `accion-correctiva-${data.id.slice(0, 8)}`,
      body: [
        DocxKit.heading('No conformidad'),
        DocxKit.keyValueTable([
          ['Proceso', data.hallazgo.proceso],
          ['Cláusula incumplida', data.hallazgo.criterio ?? '-'],
          ['Clasificación', data.hallazgo.clasificacion ?? '-'],
          ['Descripción', data.hallazgo.descripcion],
          ['Estado del hallazgo', data.hallazgo.estado],
        ]),
        DocxKit.heading('Acción correctiva'),
        DocxKit.fieldRow('Corrección', data.descripcion),
        DocxKit.fieldRow('Causa raíz', data.causaRaiz ?? ''),
        DocxKit.fieldRow('Responsable', data.responsableNombre),
        DocxKit.fieldRow('Fecha límite', data.fechaLimite ?? ''),
        DocxKit.fieldRow('Estado de la acción', data.estado),
        DocxKit.heading('Evidencia de cierre'),
        DocxKit.fieldRow('Fecha de cierre', data.fechaCierre ?? ''),
        ...(closureEvidence.length === 0 ? [DocxKit.paragraph('Sin evidencia registrada.', { muted: true })] : DocxKit.bullets(closureEvidence.map(label))),
        DocxKit.heading('Verificación de eficacia'),
        DocxKit.checkboxLine(['Eficaz', 'No eficaz'], selected),
        DocxKit.fieldRow('Verificado por', lastVerification?.verificadorNombre ?? ''),
        DocxKit.fieldRow('Comentarios', lastVerification?.comentario ?? ''),
        DocxKit.fieldRow('Nueva fecha límite', lastVerification?.nuevaFecha ?? ''),
        ...(verificationEvidence.length === 0 ? [] : DocxKit.bullets(verificationEvidence.map(label))),
        DocxKit.spacer(),
        DocxKit.signatureBlock(['Responsable de la acción', 'Auditor verificador']),
      ],
    });
  }
}

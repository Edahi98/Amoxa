import { ContentHasher } from '@registros-versionado/content-hasher.js';
import type { InformeContentInput } from '@informes-rules-informe/informe.types.js';

export class InformeFingerprint {
  public static compute(content: InformeContentInput): string {
    return ContentHasher.sha256({
      objetivos: content.objetivos,
      criterios: content.criterios,
      procesos: content.procesos,
      equipo: content.equipo,
      fechaPlan: content.fechaPlan,
      fechaReal: content.fechaReal,
      conclusiones: content.conclusiones,
      hallazgos: content.hallazgos.map((hallazgo) => ({
        id: hallazgo.id,
        tipo: hallazgo.tipo,
        clasificacion: hallazgo.clasificacion,
        criterio: hallazgo.criterio,
        descripcion: hallazgo.descripcion,
      })),
    });
  }
}

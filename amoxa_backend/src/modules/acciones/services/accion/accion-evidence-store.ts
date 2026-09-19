import type { DbExecutor } from '@db/db-executor.js';
import { accionEvidencia } from '@schemas/index.js';
import type { EvidenciaItem } from '@validators-acciones/evidencia.schema.js';

export class AccionEvidenceStore {
  public static async insert(
    executor: DbExecutor,
    accionId: string,
    etapa: 'cierre' | 'verificacion',
    ciclo: number,
    items: readonly EvidenciaItem[],
    creadoPorId: string,
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    await executor.insert(accionEvidencia).values(
      items.map((item) => ({
        accionId,
        etapa,
        ciclo,
        nombre: item.nombre ?? null,
        url: item.url ?? null,
        tipo: item.tipo ?? null,
        hash: item.hash ?? null,
        creadoPorId,
      })),
    );
  }
}

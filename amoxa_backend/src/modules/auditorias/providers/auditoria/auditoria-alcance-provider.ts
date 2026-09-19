import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { plantillaChecklist, proceso } from '@schemas/index.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaScreenProvider } from '@auditorias-providers-auditoria/auditoria-screen-provider.js';
import { AuditScreenBlocks } from '@auditorias-providers/audit-screen-blocks.js';

@ScreenDataDecorator.of('auditoria.alcance')
@Injectable()
export class AuditoriaAlcanceProvider extends AuditoriaScreenProvider {
  constructor(
    access: AuditoriaAccess,
    versions: RecordVersionService,
    @Inject(DB) private readonly db: Db,
  ) {
    super(access, versions);
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    return this.build(request, async (detalle) => {
      const procesos = await this.db
        .select({ id: proceso.id, nombre: proceso.nombre, importancia: proceso.importancia })
        .from(proceso)
        .where(eq(proceso.organizacionId, request.user.organizacionId))
        .orderBy(asc(proceso.nombre));
      const plantillas = await this.db
        .select({
          id: plantillaChecklist.id,
          nombre: plantillaChecklist.nombre,
          version: plantillaChecklist.version,
          vigente: plantillaChecklist.vigente,
        })
        .from(plantillaChecklist)
        .orderBy(asc(plantillaChecklist.nombre));
      return {
        auditoria: AuditScreenBlocks.auditoria(detalle),
        opciones: {
          procesos: procesos.map((item) => ({ value: item.id, label: item.nombre, description: `Importancia ${item.importancia}` })),
          plantillas: plantillas
            .filter((item) => item.vigente || item.id === detalle.plantilla.id)
            .map((item) => ({
              value: item.id,
              label: `${item.nombre} (v${item.version})`,
              ...(item.vigente ? {} : { disabled: true, disabledReason: 'La plantilla ya no está vigente.' }),
            })),
        },
        revision: {
          revisado: detalle.revision !== null && detalle.revision.revisadoEn !== null,
          revisado_en: detalle.revision?.revisadoEn?.toISOString() ?? '',
          comentario: detalle.revision?.comentario ?? '',
        },
      };
    });
  }
}

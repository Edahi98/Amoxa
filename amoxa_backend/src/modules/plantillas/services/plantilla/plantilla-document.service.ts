import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacion } from '@schemas/index.js';
import type { DocxFile } from '@docx/docx-file.js';
import { ListaVerificacionDocument } from '@docx-plantillas/lista-verificacion.document.js';
import { PlantillaMapper } from '@plantillas-mappers-plantilla/plantilla-mapper.js';
import { PlantillaQueryService, type PlantillaViewer } from '@plantillas-services-plantilla/plantilla-query.service.js';

@Injectable()
export class PlantillaDocumentService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: PlantillaQueryService,
  ) {}

  public async checklistFormat(id: string, organizacionId: string, viewer: PlantillaViewer): Promise<DocxFile> {
    const detail = await this.query.detail(id, organizacionId, viewer);
    const [org] = await this.db
      .select({ nombre: organizacion.nombre })
      .from(organizacion)
      .where(eq(organizacion.id, organizacionId))
      .limit(1);
    return ListaVerificacionDocument.build({
      organizacion: org?.nombre ?? 'Organización',
      plantilla: PlantillaMapper.toView({ ...detail, propuestas: [] }),
    });
  }
}

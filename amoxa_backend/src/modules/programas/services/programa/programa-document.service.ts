import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacion } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { DocxFile } from '@docx/docx-file.js';
import { ProgramaAnualDocument } from '@docx-programas/programa-anual.document.js';
import { ProgramaCalendar } from '@programas-rules-programa/programa-calendar.js';
import { ProgramaMapper } from '@programas-mappers-programa/programa-mapper.js';
import { ProgramaQueryService } from '@programas-services-programa/programa-query.service.js';

@Injectable()
export class ProgramaDocumentService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: ProgramaQueryService,
  ) {}

  public async annualProgram(id: string, organizacionId: string, role: SessionRole): Promise<DocxFile> {
    const detail = await this.query.detail(id, organizacionId, role);
    const audits = await this.query.audits(id);
    const [org] = await this.db
      .select({ nombre: organizacion.nombre })
      .from(organizacion)
      .where(eq(organizacion.id, organizacionId))
      .limit(1);
    return ProgramaAnualDocument.build({
      organizacion: org?.nombre ?? 'Organización',
      programa: ProgramaMapper.toView(detail),
      calendario: ProgramaCalendar.events(
        {
          id: detail.row.id,
          periodo: detail.row.periodo,
          fechaInicio: detail.row.fechaInicio,
          fechaFin: detail.row.fechaFin,
        },
        audits,
      ),
    });
  }
}

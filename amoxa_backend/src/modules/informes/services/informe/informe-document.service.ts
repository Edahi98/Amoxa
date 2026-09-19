import { Injectable } from '@nestjs/common';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { DocxFile } from '@docx/docx-file.js';
import { InformeAuditoriaDocument } from '@docx-informes/informe-auditoria.document.js';
import { MarcaService } from '@marca-services/marca.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';

@Injectable()
export class InformeDocumentService {
  constructor(
    private readonly reader: InformeReadService,
    private readonly marca: MarcaService,
  ) {}

  async build(informeId: string, user: TokenPayload, role: SessionRole): Promise<DocxFile> {
    const detail = await this.reader.get(informeId, user, role);
    return InformeAuditoriaDocument.build(detail, await this.marca.forDocument(user.organizacionId));
  }
}

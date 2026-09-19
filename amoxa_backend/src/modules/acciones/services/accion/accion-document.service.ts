import { Injectable } from '@nestjs/common';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { DocxFile } from '@docx/docx-file.js';
import { AccionCorrectivaDocument } from '@docx-acciones/accion-correctiva.document.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';

@Injectable()
export class AccionDocumentService {
  constructor(private readonly queries: AccionQueryService) {}

  async build(accionId: string, user: TokenPayload, role: SessionRole): Promise<DocxFile> {
    const detail = await this.queries.get(accionId, user, role);
    return AccionCorrectivaDocument.build(detail);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacion } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { DocxFile } from '@docx/docx-file.js';
import { EvaluacionCompetenciaDocument } from '@docx-auditores/evaluacion-competencia.document.js';
import { FichaAuditorDocument } from '@docx-auditores/ficha-auditor.document.js';
import { AuditorAccess } from '@auditores-rules-auditor/auditor-access.js';
import { AuditorMapper } from '@auditores-mappers-auditor/auditor-mapper.js';
import { AuditorQueryService } from '@auditores-services-auditor/auditor-query.service.js';

@Injectable()
export class AuditorDocumentService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: AuditorQueryService,
  ) {}

  public async fichaDocument(id: string, organizacionId: string, role: SessionRole, userId: string): Promise<DocxFile> {
    AuditorAccess.assertCanRead(role, userId, id);
    const record = await this.query.find(id, organizacionId);
    const evaluaciones = await this.query.evaluations(id);
    return FichaAuditorDocument.build({
      organizacion: await this.organizationName(organizacionId),
      auditor: AuditorMapper.toView(record, evaluaciones),
    });
  }

  public async evaluationDocument(
    id: string,
    evaluacionId: string,
    organizacionId: string,
    role: SessionRole,
    userId: string,
  ): Promise<DocxFile> {
    AuditorAccess.assertCanRead(role, userId, id);
    const record = await this.query.find(id, organizacionId);
    const evaluation = await this.query.evaluation(id, evaluacionId);
    return EvaluacionCompetenciaDocument.build({
      organizacion: await this.organizationName(organizacionId),
      auditorNombre: record.nombre,
      evaluacion: AuditorMapper.evaluationView(evaluation),
    });
  }

  private async organizationName(organizacionId: string): Promise<string> {
    const [org] = await this.db
      .select({ nombre: organizacion.nombre })
      .from(organizacion)
      .where(eq(organizacion.id, organizacionId))
      .limit(1);
    return org?.nombre ?? 'Organización';
  }
}

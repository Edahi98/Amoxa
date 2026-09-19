import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { propuestaPregunta } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { EncodedFileReader } from '@common-files/encoded-file-reader.js';
import type { ImportarBody } from '@validators-plantillas/importar-body.schema.js';
import { CriterioMapper } from '@plantillas-rules/criterio-mapper.js';
import { PlantillaQueryService } from '@plantillas-services-plantilla/plantilla-query.service.js';
import { PlantillasService } from '@plantillas-services/plantillas.service.js';
import { DocumentTextExtractor } from '@plantillas-importacion/document-text-extractor.js';
import { QuestionHeuristics } from '@plantillas-importacion/question-heuristics.js';

export interface ImportResult {
  importadas: number;
}

@Injectable()
export class PlantillaImportService {
  public static readonly MAX_BYTES = 5 * 1024 * 1024;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: PlantillaQueryService,
    private readonly plantillas: PlantillasService,
  ) {}

  public async import(id: string, user: TokenPayload, role: SessionRole, body: ImportarBody): Promise<ImportResult> {
    const data = EncodedFileReader.decode(body.archivo, PlantillaImportService.MAX_BYTES);
    const plantilla = await this.query.find(id, user.organizacionId, { role, userId: user.sub });
    if (plantilla.estado === 'archivada') {
      throw new BadRequestException('La plantilla está archivada y ya no recibe propuestas.');
    }
    const questions = QuestionHeuristics.from(await DocumentTextExtractor.lines(data));
    if (questions.length === 0) {
      throw new BadRequestException('No se encontraron preguntas en el archivo.');
    }
    const tipoCriterio = CriterioMapper.toDb(body.criterio);
    await this.db.insert(propuestaPregunta).values(
      questions.map((question) => ({
        plantillaId: plantilla.id,
        propuestaPorId: user.sub,
        texto: question.texto,
        clausulaRef: question.clausula ?? body.clausula,
        tipoCriterio,
      })),
    );
    return { importadas: questions.length };
  }

  public async resolveAll(id: string, user: TokenPayload, decision: 'aceptar' | 'rechazar'): Promise<{ resueltas: number }> {
    const pending = await this.db
      .select({ id: propuestaPregunta.id })
      .from(propuestaPregunta)
      .where(and(eq(propuestaPregunta.plantillaId, id), eq(propuestaPregunta.estado, 'pendiente')));
    for (const proposal of pending) {
      if (decision === 'aceptar') await this.plantillas.acceptProposal(id, proposal.id, user);
      else await this.plantillas.rejectProposal(id, proposal.id, user);
    }
    return { resueltas: pending.length };
  }
}

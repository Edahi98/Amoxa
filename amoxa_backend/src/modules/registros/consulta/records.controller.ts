import { Controller, Get, Param, Query, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { RecordHistoryDocx } from '@docx-registros/record-history.docx.js';
import { DocxResponder } from '@docx/docx-responder.js';
import type { RecordHistory, RecordPage } from '@registros-consulta-record/record-entry.types.js';
import { RecordHistoryService } from '@registros-consulta-record/record-history.service.js';
import { RecordSearchService } from '@registros-consulta-record/record-search.service.js';
import { RecordIdSchema } from '@validators-registros/record-id.schema.js';
import { RecordSearchSchema, type RecordSearchInput } from '@validators-registros/record-search.schema.js';

@Controller('registros')
export class RecordsController {
  constructor(
    private readonly search: RecordSearchService,
    private readonly history: RecordHistoryService,
  ) {}

  @Authorized.anyPermission('registro.consultar', 'registro.consultar_propias', 'registro.consultar_proceso')
  @Get()
  public async list(
    @Req() request: Request,
    @Query(new ZodValidationPipe(RecordSearchSchema)) query: RecordSearchInput,
  ): Promise<RecordPage> {
    return this.search.search(request.user!, RequestRole.resolve(request), query);
  }

  @Authorized.anyPermission('registro.consultar', 'registro.consultar_propias', 'registro.consultar_proceso')
  @Get(':id/historial')
  public async versions(
    @Req() request: Request,
    @Param('id', new ZodValidationPipe(RecordIdSchema)) id: string,
  ): Promise<RecordHistory> {
    return this.history.history(request.user!, RequestRole.resolve(request), id);
  }

  @Authorized.permissions('registro.exportar')
  @Get(':id/historial/exportar')
  public async exportHistory(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id', new ZodValidationPipe(RecordIdSchema)) id: string,
  ): Promise<StreamableFile> {
    const data = await this.history.documentData(request.user!, RequestRole.resolve(request), id);
    return DocxResponder.stream(response, await RecordHistoryDocx.build(data));
  }
}

import { Body, Controller, Get, Headers, Param, Put, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { GuardarRespuestasSchema, type GuardarRespuestasInput } from '@validators-ejecucion/guardar-respuestas.schema.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import { ChecklistHeaders } from '@ejecucion-checklist/checklist-headers.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';
import type { ChecklistSaveResult, ChecklistView } from '@ejecucion-checklist/checklist-view.js';
import { EjecucionDocumentoService } from '@ejecucion-documentos/ejecucion-documento.service.js';

@Controller('auditorias')
export class ChecklistController {
  constructor(
    private readonly checklist: ChecklistService,
    private readonly documentos: EjecucionDocumentoService,
  ) {}

  @Get(':id/checklist/documento')
  @Authorized.anyPermission('ejecucion.responder_checklist', 'hallazgo.revisar')
  public async documento(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return DocxResponder.stream(response, await this.documentos.checklistDocument(id, RequestUser.of(request)));
  }

  @Get(':id/checklist')
  @Authorized.anyPermission('ejecucion.responder_checklist', 'hallazgo.revisar')
  public async ver(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Req() request: Request,
  ): Promise<ChecklistView> {
    return this.checklist.view(id, RequestUser.of(request));
  }

  @Put(':id/respuestas')
  @Authorized.permissions('ejecucion.responder_checklist')
  public async guardar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(GuardarRespuestasSchema)) body: GuardarRespuestasInput,
    @Req() request: Request,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('if-version') ifVersion?: string,
  ): Promise<ChecklistSaveResult> {
    return this.checklist.save(id, RequestUser.of(request), body, ChecklistHeaders.parse(idempotencyKey, ifVersion));
  }
}

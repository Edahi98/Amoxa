import { Body, Controller, Get, Param, Post, Put, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { AuditorFichaSchema, type AuditorFichaBody } from '@validators-auditores/auditor-ficha.schema.js';
import { AuditorIdSchema } from '@validators-auditores/auditor-id.schema.js';
import { EvaluacionBodySchema, type EvaluacionBody } from '@validators-auditores-evaluacion/evaluacion-body.schema.js';
import { EvaluacionIdSchema } from '@validators-auditores-evaluacion/evaluacion-id.schema.js';
import { AuditorAccess } from '@auditores-rules-auditor/auditor-access.js';
import { AuditorMapper } from '@auditores-mappers-auditor/auditor-mapper.js';
import type { AuditorSummary, AuditorView } from '@auditores-mappers-auditor/auditor-view.js';
import { AuditorDocumentService } from '@auditores-services-auditor/auditor-document.service.js';
import { AuditorQueryService } from '@auditores-services-auditor/auditor-query.service.js';
import { AuditoresService, type EvaluacionResultado } from '@auditores-services/auditores.service.js';

@Controller('auditores')
export class AuditoresController {
  constructor(
    private readonly auditores: AuditoresService,
    private readonly query: AuditorQueryService,
    private readonly documents: AuditorDocumentService,
  ) {}

  @Get()
  @Authorized.permissions('auditor.consultar')
  public async list(@Req() request: Request): Promise<AuditorSummary[]> {
    const records = await this.query.list(request.user!.organizacionId);
    return records.map((record) => AuditorMapper.toSummary(record));
  }

  @Get(':id')
  @Authorized.anyPermission('auditor.consultar', 'auditor.ver_ficha_propia')
  public async detail(
    @Param('id', new ZodValidationPipe(AuditorIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<AuditorView> {
    AuditorAccess.assertCanRead(RequestRole.resolve(request), request.user!.sub, id);
    const record = await this.query.find(id, request.user!.organizacionId);
    return AuditorMapper.toView(record, await this.query.evaluations(id));
  }

  @Get(':id/ficha/documento')
  @Authorized.anyPermission('auditor.consultar', 'auditor.ver_ficha_propia')
  public async fichaDocument(
    @Param('id', new ZodValidationPipe(AuditorIdSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.fichaDocument(
      id,
      request.user!.organizacionId,
      RequestRole.resolve(request),
      request.user!.sub,
    );
    return DocxResponder.stream(response, file);
  }

  @Get(':id/evaluaciones/:evaluacionId/documento')
  @Authorized.anyPermission('auditor.consultar', 'auditor.ver_ficha_propia')
  public async evaluationDocument(
    @Param('id', new ZodValidationPipe(AuditorIdSchema)) id: string,
    @Param('evaluacionId', new ZodValidationPipe(EvaluacionIdSchema)) evaluacionId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.evaluationDocument(
      id,
      evaluacionId,
      request.user!.organizacionId,
      RequestRole.resolve(request),
      request.user!.sub,
    );
    return DocxResponder.stream(response, file);
  }

  @Put(':id')
  @Authorized.permissions('auditor.editar_ficha')
  public updateFicha(
    @Param('id', new ZodValidationPipe(AuditorIdSchema)) id: string,
    @Body(new ZodValidationPipe(AuditorFichaSchema)) body: AuditorFichaBody,
    @Req() request: Request,
  ): Promise<AuditorView> {
    return this.auditores.updateFicha(id, request.user!, body);
  }

  @Post(':id/evaluaciones')
  @Authorized.permissions('auditor.evaluar')
  public registerEvaluation(
    @Param('id', new ZodValidationPipe(AuditorIdSchema)) id: string,
    @Body(new ZodValidationPipe(EvaluacionBodySchema)) body: EvaluacionBody,
    @Req() request: Request,
  ): Promise<EvaluacionResultado> {
    return this.auditores.registerEvaluation(id, request.user!, body);
  }
}

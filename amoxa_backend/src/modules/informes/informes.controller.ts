import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req, Res, StreamableFile, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { ConclusionesSchema, type ConclusionesInput } from '@validators-informes/conclusiones.schema.js';
import { DistribucionSchema, type DistribucionInput } from '@validators-informes/distribucion.schema.js';
import { FirmaSchema, type FirmaInput } from '@validators-informes/firma.schema.js';
import { InformeIdSchema, InformeListQuerySchema, type InformeListQuery } from '@validators-informes/informe-params.schema.js';
import { InformeApprovalService } from '@informes-services-informe/informe-approval.service.js';
import { InformeDistributionService } from '@informes-services-informe/informe-distribution.service.js';
import { InformeDocumentService } from '@informes-services-informe/informe-document.service.js';
import { InformeShareService, type SharedLink } from '@informes-services-informe/informe-share.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';
import { EnlaceCrearSchema, type EnlaceCrearInput } from '@validators-informes/enlace-crear.schema.js';
import { InformeReviewService } from '@informes-services-informe/informe-review.service.js';

@Controller('informes')
export class InformesController {
  constructor(
    private readonly reader: InformeReadService,
    private readonly review: InformeReviewService,
    private readonly distribution: InformeDistributionService,
    private readonly approval: InformeApprovalService,
    private readonly documents: InformeDocumentService,
    private readonly share: InformeShareService,
  ) {}

  @Get()
  @Authorized.anyPermission('informe.leer', 'informe.revisar', 'informe.aprobar')
  public async list(@Query(new ZodValidationPipe(InformeListQuerySchema)) query: InformeListQuery, @Req() request: Request) {
    return this.reader.list(InformesController.user(request), RequestRole.resolve(request), query.auditoriaId);
  }

  @Get(':id')
  @Authorized.anyPermission('informe.leer', 'informe.revisar', 'informe.aprobar')
  public async detail(@Param('id', new ZodValidationPipe(InformeIdSchema)) id: string, @Req() request: Request) {
    return this.reader.get(id, InformesController.user(request), RequestRole.resolve(request));
  }

  @Get(':id/documento')
  @Authorized.anyPermission('informe.leer', 'informe.revisar', 'informe.aprobar')
  public async document(
    @Param('id', new ZodValidationPipe(InformeIdSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.build(id, InformesController.user(request), RequestRole.resolve(request));
    return DocxResponder.stream(response, file);
  }

  @Put(':id/conclusiones')
  @Authorized.permissions('informe.revisar')
  public async updateConclusions(
    @Param('id', new ZodValidationPipe(InformeIdSchema)) id: string,
    @Body(new ZodValidationPipe(ConclusionesSchema)) body: ConclusionesInput,
    @Req() request: Request,
  ) {
    return this.review.updateConclusions(id, InformesController.user(request), body.conclusiones);
  }

  @Post(':id/firma')
  @Authorized.permissions('informe.firmar')
  public async sign(
    @Param('id', new ZodValidationPipe(InformeIdSchema)) id: string,
    @Body(new ZodValidationPipe(FirmaSchema)) body: FirmaInput,
    @Req() request: Request,
  ) {
    return this.review.sign(id, InformesController.user(request), body.firma, body.conclusiones);
  }

  @Post(':id/distribucion')
  @Authorized.permissions('informe.distribuir')
  public async distribute(
    @Param('id', new ZodValidationPipe(InformeIdSchema)) id: string,
    @Body(new ZodValidationPipe(DistribucionSchema)) body: DistribucionInput,
    @Req() request: Request,
  ) {
    return this.distribution.distribute(id, InformesController.user(request), body.destinatarios);
  }

  @Post(':id/enlaces')
  @Authorized.permissions('informe.distribuir')
  public async createLink(
    @Param('id', new ZodValidationPipe(InformeIdSchema)) id: string,
    @Body(new ZodValidationPipe(EnlaceCrearSchema)) body: EnlaceCrearInput,
    @Req() request: Request,
  ): Promise<SharedLink> {
    return this.share.create(id, InformesController.user(request), RequestRole.resolve(request), body.dias, request.ip ?? null);
  }

  @Post(':id/enlaces/revocar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('informe.distribuir')
  public async revokeLinks(
    @Param('id', new ZodValidationPipe(InformeIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<{ revocados: number }> {
    return this.share.revokeAll(id, InformesController.user(request), RequestRole.resolve(request), request.ip ?? null);
  }

  @Post(':id/acuse')
  @Authorized.permissions('informe.acusar_recibo')
  public async acknowledge(@Param('id', new ZodValidationPipe(InformeIdSchema)) id: string, @Req() request: Request) {
    return this.reader.acknowledge(id, InformesController.user(request), RequestRole.resolve(request));
  }

  @Post(':id/aprobacion')
  @Authorized.permissions('informe.aprobar')
  public async approve(@Param('id', new ZodValidationPipe(InformeIdSchema)) id: string, @Req() request: Request) {
    return this.approval.approve(id, InformesController.user(request));
  }

  private static user(request: Request): TokenPayload {
    if (request.user === undefined) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return request.user;
  }
}

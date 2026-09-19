import { Body, Controller, Get, Param, Post, Query, Req, Res, StreamableFile, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { AccionIdSchema, AccionListQuerySchema, type AccionListQuery } from '@validators-acciones/accion-params.schema.js';
import { CierreAccionSchema, type CierreAccionInput } from '@validators-acciones/cierre-accion.schema.js';
import { CrearAccionSchema, type CrearAccionInput } from '@validators-acciones/crear-accion.schema.js';
import { VerificacionAccionSchema, type VerificacionAccionInput } from '@validators-acciones/verificacion-accion.schema.js';
import { AccionClosureService } from '@acciones-services-accion/accion-closure.service.js';
import { AccionCreationService } from '@acciones-services-accion/accion-creation.service.js';
import { AccionDocumentService } from '@acciones-services-accion/accion-document.service.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';
import { AccionVerificationService } from '@acciones-services-accion/accion-verification.service.js';

@Controller()
export class AccionesController {
  constructor(
    private readonly queries: AccionQueryService,
    private readonly creation: AccionCreationService,
    private readonly closure: AccionClosureService,
    private readonly verification: AccionVerificationService,
    private readonly documents: AccionDocumentService,
  ) {}

  @Get('acciones')
  @Authorized.anyPermission('accion.consultar_propias', 'accion.consultar_todas', 'accion.consultar_por_verificar')
  public async list(@Query(new ZodValidationPipe(AccionListQuerySchema)) query: AccionListQuery, @Req() request: Request) {
    return this.queries.list(AccionesController.user(request), RequestRole.resolve(request), query);
  }

  @Get('acciones/:id')
  @Authorized.anyPermission('accion.consultar_propias', 'accion.consultar_todas', 'accion.consultar_por_verificar')
  public async detail(@Param('id', new ZodValidationPipe(AccionIdSchema)) id: string, @Req() request: Request) {
    return this.queries.get(id, AccionesController.user(request), RequestRole.resolve(request));
  }

  @Get('acciones/:id/documento')
  @Authorized.anyPermission('accion.consultar_propias', 'accion.consultar_todas', 'accion.consultar_por_verificar')
  public async document(
    @Param('id', new ZodValidationPipe(AccionIdSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.build(id, AccionesController.user(request), RequestRole.resolve(request));
    return DocxResponder.stream(response, file);
  }

  @Post('hallazgos/:id/acciones')
  @Authorized.permissions('accion.crear')
  public async create(
    @Param('id', new ZodValidationPipe(AccionIdSchema)) id: string,
    @Body(new ZodValidationPipe(CrearAccionSchema)) body: CrearAccionInput,
    @Req() request: Request,
  ) {
    return this.creation.create(id, AccionesController.user(request), body);
  }

  @Post('acciones/:id/cierre')
  @Authorized.permissions('accion.reportar_cierre')
  public async reportClosure(
    @Param('id', new ZodValidationPipe(AccionIdSchema)) id: string,
    @Body(new ZodValidationPipe(CierreAccionSchema)) body: CierreAccionInput,
    @Req() request: Request,
  ) {
    return this.closure.report(id, AccionesController.user(request), body);
  }

  @Post('acciones/:id/verificacion')
  @Authorized.permissions('accion.verificar_eficacia')
  public async verify(
    @Param('id', new ZodValidationPipe(AccionIdSchema)) id: string,
    @Body(new ZodValidationPipe(VerificacionAccionSchema)) body: VerificacionAccionInput,
    @Req() request: Request,
  ) {
    return this.verification.verify(id, AccionesController.user(request), body);
  }

  @Post('acciones/:id/reapertura')
  @Authorized.permissions('accion.verificar_eficacia')
  public async reopen(
    @Param('id', new ZodValidationPipe(AccionIdSchema)) id: string,
    @Body(new ZodValidationPipe(VerificacionAccionSchema)) body: VerificacionAccionInput,
    @Req() request: Request,
  ) {
    return this.verification.reopen(id, AccionesController.user(request), body);
  }

  private static user(request: Request): TokenPayload {
    if (request.user === undefined) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return request.user;
  }
}

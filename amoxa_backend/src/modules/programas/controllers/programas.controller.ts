import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { ProgramaBodySchema, type ProgramaBody } from '@validators-programas/programa-body.schema.js';
import { ProgramaDecisionSchema, type ProgramaDecision } from '@validators-programas/programa-decision.schema.js';
import { ProgramaIdSchema } from '@validators-programas/programa-id.schema.js';
import { ProgramaMapper } from '@programas-mappers-programa/programa-mapper.js';
import type { ProgramaSummary, ProgramaView } from '@programas-mappers-programa/programa-view.js';
import { ProgramaDocumentService } from '@programas-services-programa/programa-document.service.js';
import { ProgramaQueryService } from '@programas-services-programa/programa-query.service.js';
import { ProgramasService } from '@programas-services/programas.service.js';

@Controller('programas')
export class ProgramasController {
  constructor(
    private readonly programas: ProgramasService,
    private readonly query: ProgramaQueryService,
    private readonly documents: ProgramaDocumentService,
  ) {}

  @Get()
  @Authorized.permissions('programa.consultar')
  public async list(@Req() request: Request): Promise<ProgramaSummary[]> {
    const rows = await this.query.list(request.user!.organizacionId, RequestRole.resolve(request));
    return rows.map((row) => ProgramaMapper.toSummary(row));
  }

  @Get(':id')
  @Authorized.permissions('programa.consultar')
  public async detail(
    @Param('id', new ZodValidationPipe(ProgramaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<ProgramaView> {
    return ProgramaMapper.toView(await this.query.detail(id, request.user!.organizacionId, RequestRole.resolve(request)));
  }

  @Get(':id/documento')
  @Authorized.permissions('programa.consultar')
  public async document(
    @Param('id', new ZodValidationPipe(ProgramaIdSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.annualProgram(id, request.user!.organizacionId, RequestRole.resolve(request));
    return DocxResponder.stream(response, file);
  }

  @Post()
  @Authorized.permissions('programa.crear')
  public create(
    @Body(new ZodValidationPipe(ProgramaBodySchema)) body: ProgramaBody,
    @Req() request: Request,
  ): Promise<ProgramaView> {
    return this.programas.create(request.user!, body);
  }

  @Put(':id')
  @Authorized.permissions('programa.editar')
  public update(
    @Param('id', new ZodValidationPipe(ProgramaIdSchema)) id: string,
    @Body(new ZodValidationPipe(ProgramaBodySchema)) body: ProgramaBody,
    @Req() request: Request,
  ): Promise<ProgramaView> {
    return this.programas.update(id, request.user!, body);
  }

  @Post(':id/enviar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('programa.editar')
  public send(
    @Param('id', new ZodValidationPipe(ProgramaIdSchema)) id: string,
    @Body(new ZodValidationPipe(ProgramaBodySchema)) body: ProgramaBody,
    @Req() request: Request,
  ): Promise<ProgramaView> {
    return this.programas.send(id, request.user!, body);
  }

  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('programa.aprobar')
  public approve(
    @Param('id', new ZodValidationPipe(ProgramaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<ProgramaView> {
    return this.programas.approve(id, request.user!);
  }

  @Post(':id/devolver')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('programa.devolver')
  public giveBack(
    @Param('id', new ZodValidationPipe(ProgramaIdSchema)) id: string,
    @Body(new ZodValidationPipe(ProgramaDecisionSchema)) decision: ProgramaDecision,
    @Req() request: Request,
  ): Promise<ProgramaView> {
    return this.programas.giveBack(id, request.user!, decision.motivo_devolucion);
  }
}

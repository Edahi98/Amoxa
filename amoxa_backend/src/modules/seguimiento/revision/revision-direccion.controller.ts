import { Body, Controller, Get, Param, Post, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { ReviewMinutesDocx } from '@docx-seguimiento/review-minutes.docx.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { ReviewMinutesService } from '@seguimiento-revision-review/review-minutes.service.js';
import { RevisionDireccionService } from '@seguimiento-revision/revision-direccion.service.js';
import type { RevisionView, RevisionWriteResult } from '@seguimiento-revision/revision.types.js';
import { ProgramIdSchema } from '@validators-seguimiento/program-id.schema.js';
import { ReviewDecisionSchema, type ReviewDecisionInput } from '@validators-seguimiento/review-decision.schema.js';

@Controller('programas')
export class RevisionDireccionController {
  constructor(
    private readonly revision: RevisionDireccionService,
    private readonly minutes: ReviewMinutesService,
  ) {}

  @Authorized.anyPermission('revision_direccion.decidir', 'revision_direccion.presentar')
  @Get(':id/revision-direccion')
  public async view(
    @Req() request: Request,
    @Param('id', new ZodValidationPipe(ProgramIdSchema)) id: string,
  ): Promise<RevisionView> {
    return this.revision.view(request.user!, id);
  }

  @Authorized.anyPermission('revision_direccion.decidir', 'revision_direccion.presentar')
  @Get(':id/revision-direccion/acta')
  public async minutesDocument(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id', new ZodValidationPipe(ProgramIdSchema)) id: string,
  ): Promise<StreamableFile> {
    const data = await this.minutes.data(request.user!, id);
    return DocxResponder.stream(response, await ReviewMinutesDocx.build(data));
  }

  @Authorized.permissions('revision_direccion.presentar')
  @Post(':id/revision-direccion/presentacion')
  public async present(
    @Req() request: Request,
    @Param('id', new ZodValidationPipe(ProgramIdSchema)) id: string,
  ): Promise<RevisionWriteResult> {
    return this.revision.present(request.user!, id);
  }

  @Authorized.permissions('revision_direccion.decidir')
  @Post(':id/revision-direccion/decisiones')
  public async decide(
    @Req() request: Request,
    @Param('id', new ZodValidationPipe(ProgramIdSchema)) id: string,
    @Body(new ZodValidationPipe(ReviewDecisionSchema)) body: ReviewDecisionInput,
  ): Promise<RevisionWriteResult> {
    return this.revision.decide(request.user!, id, body);
  }
}

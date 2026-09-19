import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { ProgramReviewService } from '@seguimiento-revision-program/program-review.service.js';
import type { NextProgramResult, RevisionWriteResult } from '@seguimiento-revision/revision.types.js';
import { LessonSchema, type LessonInput } from '@validators-seguimiento/lesson.schema.js';
import { NextPeriodSchema, type NextPeriodInput } from '@validators-seguimiento/next-period.schema.js';
import { ProgramIdSchema } from '@validators-seguimiento/program-id.schema.js';

@Controller('programas')
export class ProgramReviewController {
  constructor(private readonly review: ProgramReviewService) {}

  @Authorized.permissions('revision_programa.registrar_lecciones')
  @Post(':id/lecciones')
  public async lessons(
    @Req() request: Request,
    @Param('id', new ZodValidationPipe(ProgramIdSchema)) id: string,
    @Body(new ZodValidationPipe(LessonSchema)) body: LessonInput,
  ): Promise<RevisionWriteResult> {
    return this.review.registerLessons(request.user!, id, body);
  }

  @Authorized.permissions('revision_programa.crear_version')
  @Post(':id/siguiente')
  public async next(
    @Req() request: Request,
    @Param('id', new ZodValidationPipe(ProgramIdSchema)) id: string,
    @Body(new ZodValidationPipe(NextPeriodSchema)) body: NextPeriodInput,
  ): Promise<NextProgramResult> {
    return this.review.createNext(request.user!, id, body);
  }
}

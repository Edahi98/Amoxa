import { Controller, Get, Query, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { IndicatorsReportDocx } from '@docx-seguimiento/indicators-report.docx.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { IndicatorsService, type IndicatorsView } from '@seguimiento-indicadores-indicators/indicators.service.js';
import { IndicatorsReportService } from '@seguimiento-indicadores-indicators/indicators-report.service.js';
import { IndicatorQuerySchema, type IndicatorQueryInput } from '@validators-seguimiento/indicator-query.schema.js';

@Controller('programas/indicadores')
export class IndicatorsController {
  constructor(
    private readonly indicators: IndicatorsService,
    private readonly reports: IndicatorsReportService,
  ) {}

  @Authorized.anyPermission('dashboard.consultar', 'dashboard.analizar')
  @Get()
  public async list(
    @Req() request: Request,
    @Query(new ZodValidationPipe(IndicatorQuerySchema)) query: IndicatorQueryInput,
  ): Promise<IndicatorsView> {
    return this.indicators.forUser(request.user!, query.periodo, query.area);
  }

  @Authorized.anyPermission('dashboard.consultar', 'dashboard.analizar')
  @Get('documento')
  public async document(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Query(new ZodValidationPipe(IndicatorQuerySchema)) query: IndicatorQueryInput,
  ): Promise<StreamableFile> {
    const data = await this.reports.data(request.user!, query.periodo, query.area);
    return DocxResponder.stream(response, await IndicatorsReportDocx.build(data));
  }
}

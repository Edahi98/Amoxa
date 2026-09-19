import { Controller, Get, Param, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottleDecorator } from '@common-throttle/throttle.decorator.js';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { InformeShareService } from '@informes-services-informe/informe-share.service.js';

@Controller('compartido/informes')
export class CompartidoController {
  constructor(private readonly share: InformeShareService) {}

  @Get(':token')
  @UseGuards(ThrottleGuard)
  @ThrottleDecorator.of({ limit: 30, windowMs: 15 * 60 * 1000 })
  public async open(
    @Param('token') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.share.open(token.slice(0, 256), request.ip ?? null);
    return DocxResponder.stream(response, file);
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { ThrottleDecorator } from '@common-throttle/throttle.decorator.js';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import { RestablecerClaveSchema, type RestablecerClaveInput } from '@validators-solicitudes/restablecer-clave.schema.js';
import { SolicitudResetService } from '@solicitudes-services-solicitud/solicitud-reset.service.js';

@Controller('password-reset')
export class RestablecimientoController {
  constructor(private readonly reset: SolicitudResetService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottleGuard)
  @ThrottleDecorator.of({ limit: 10, windowMs: 15 * 60 * 1000 })
  public complete(
    @Body(new ZodValidationPipe(RestablecerClaveSchema)) body: RestablecerClaveInput,
    @Req() request: Request,
  ): Promise<void> {
    return this.reset.complete(body.token, body.password, request.ip ?? null);
  }
}

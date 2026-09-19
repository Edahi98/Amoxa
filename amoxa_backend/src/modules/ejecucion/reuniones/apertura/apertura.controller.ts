import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { RegistrarAperturaSchema, type RegistrarAperturaInput } from '@validators-ejecucion/registrar-apertura.schema.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import { AperturaService } from '@ejecucion-reuniones-apertura/apertura.service.js';
import type { ReunionView } from '@ejecucion-reuniones/reunion-view.js';

@Controller('auditorias')
export class AperturaController {
  constructor(private readonly apertura: AperturaService) {}

  @Post(':id/apertura')
  @Authorized.permissions('ejecucion.presidir_apertura')
  public async registrar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(RegistrarAperturaSchema)) body: RegistrarAperturaInput,
    @Req() request: Request,
  ): Promise<ReunionView> {
    return this.apertura.register(id, RequestUser.of(request), body);
  }

  @Post(':id/apertura/asistencia')
  @Authorized.permissions('ejecucion.asistir_apertura')
  public async confirmar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Req() request: Request,
  ): Promise<ReunionView> {
    return this.apertura.confirm(id, RequestUser.of(request));
  }
}

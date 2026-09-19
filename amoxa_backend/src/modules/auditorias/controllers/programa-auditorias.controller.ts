import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { CrearAuditoriaSchema, type CrearAuditoriaInput } from '@validators-auditorias/crear-auditoria.schema.js';
import { UuidParamSchema } from '@validators-auditorias/uuid-param.schema.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditoriaCreator } from '@auditorias-services-auditoria/auditoria-creator.js';

@Controller('programas')
export class ProgramaAuditoriasController {
  constructor(private readonly creator: AuditoriaCreator) {}

  @Post(':programaId/auditorias')
  @Authorized.permissions('auditoria.crear')
  public async create(
    @Param('programaId', new ZodValidationPipe(UuidParamSchema)) programaId: string,
    @Body(new ZodValidationPipe(CrearAuditoriaSchema)) input: CrearAuditoriaInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.creator.create(programaId, input, request.user!);
  }
}

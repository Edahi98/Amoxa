import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { AceptarHallazgosSchema, type AceptarHallazgosInput } from '@validators-ejecucion-cierre/aceptar-hallazgos.schema.js';
import { AnotarRevisionSchema, type AnotarRevisionInput } from '@validators-ejecucion-cierre/anotar-revision.schema.js';
import { CerrarAuditoriaSchema, type CerrarAuditoriaInput } from '@validators-ejecucion-cierre/cerrar-auditoria.schema.js';
import { DiscreparSchema, type DiscreparInput } from '@validators-ejecucion-cierre/discrepar.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import {
  CierreService,
  type AcceptanceResult,
  type ClosureResult,
  type ClosureReviewResult,
} from '@ejecucion-reuniones-cierre/cierre.service.js';
import type { ReunionView } from '@ejecucion-reuniones/reunion-view.js';

@Controller('auditorias')
export class CierreController {
  constructor(private readonly cierre: CierreService) {}

  @Post(':id/cierre/revisiones')
  @Authorized.permissions('ejecucion.presentar_cierre')
  public async anotarRevision(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(AnotarRevisionSchema)) body: AnotarRevisionInput,
    @Req() request: Request,
  ): Promise<ClosureReviewResult> {
    return this.cierre.annotateReview(id, RequestUser.of(request), body);
  }

  @Post(':id/cierre/asistencia')
  @Authorized.permissions('ejecucion.asistir_cierre')
  public async asistir(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Req() request: Request,
  ): Promise<ReunionView> {
    return this.cierre.attend(id, RequestUser.of(request));
  }

  @Post(':id/cierre/discrepancia')
  @Authorized.permissions('ejecucion.aceptar_o_discrepar_cierre')
  public async discrepar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(DiscreparSchema)) body: DiscreparInput,
    @Req() request: Request,
  ): Promise<AcceptanceResult> {
    return this.cierre.discrepar(id, RequestUser.of(request), body);
  }

  @Post(':id/cierre/aceptacion')
  @Authorized.permissions('ejecucion.aceptar_o_discrepar_cierre')
  public async aceptar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(AceptarHallazgosSchema)) body: AceptarHallazgosInput,
    @Req() request: Request,
  ): Promise<AcceptanceResult> {
    return this.cierre.accept(id, RequestUser.of(request), body);
  }

  @Post(':id/cierre')
  @Authorized.permissions('ejecucion.presentar_cierre')
  public async cerrar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(CerrarAuditoriaSchema)) body: CerrarAuditoriaInput,
    @Req() request: Request,
  ): Promise<ClosureResult> {
    return this.cierre.close(id, RequestUser.of(request), body);
  }
}

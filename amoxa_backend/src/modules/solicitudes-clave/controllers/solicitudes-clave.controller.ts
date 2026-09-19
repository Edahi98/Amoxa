import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { ThrottleDecorator } from '@common-throttle/throttle.decorator.js';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import {
  CrearSolicitudSchema,
  type CrearSolicitudInput,
} from '@validators-solicitudes/crear-solicitud.schema.js';
import { SolicitudIdSchema } from '@validators-solicitudes/solicitud-id.schema.js';
import { SolicitudDecisionService } from '@solicitudes-services-solicitud/solicitud-decision.service.js';
import type { IssuedLink } from '@solicitudes-services-solicitud/solicitud-issuer.service.js';
import { SolicitudQueryService, type SolicitudPendiente } from '@solicitudes-services-solicitud/solicitud-query.service.js';
import { SolicitudRequestService } from '@solicitudes-services-solicitud/solicitud-request.service.js';

@Controller('password-requests')
export class SolicitudesClaveController {
  public static readonly ACCEPTED_MESSAGE =
    'Si el correo corresponde a una cuenta habilitada, un administrador revisará tu solicitud.';

  constructor(
    private readonly requests: SolicitudRequestService,
    private readonly query: SolicitudQueryService,
    private readonly decisions: SolicitudDecisionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ThrottleGuard)
  @ThrottleDecorator.of({ limit: 5, windowMs: 15 * 60 * 1000 })
  public async submit(
    @Body(new ZodValidationPipe(CrearSolicitudSchema)) body: CrearSolicitudInput,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    await this.requests.submit(body.email, request.ip ?? null);
    return { message: SolicitudesClaveController.ACCEPTED_MESSAGE };
  }

  @Get()
  @Authorized.roles('administrador', 'superusuario')
  public list(@Req() request: Request): Promise<SolicitudPendiente[]> {
    return this.query.pendingFor(RequestRole.resolve(request));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Authorized.roles('administrador', 'superusuario')
  public approve(
    @Param('id', new ZodValidationPipe(SolicitudIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<IssuedLink> {
    return this.decisions.approve(id, request.user!.sub, RequestRole.resolve(request), request.ip ?? null);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorized.roles('administrador', 'superusuario')
  public reject(
    @Param('id', new ZodValidationPipe(SolicitudIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.decisions.reject(id, request.user!.sub, RequestRole.resolve(request), request.ip ?? null);
  }
}

import { Body, Controller, HttpCode, HttpStatus, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { FlujoIdSchema } from '@validators-flujos/flujo-id.schema.js';
import { FlujoIniciarSchema, type FlujoIniciarInput } from '@validators-flujos/flujo-iniciar.schema.js';
import { InstanciaIdSchema } from '@validators-flujos/instancia-id.schema.js';
import { MenuBloqueoSchema, type MenuBloqueoInput } from '@validators-flujos/menu-bloqueo.schema.js';
import { MenuBloqueoService } from '@flujos-services-flujo/menu-bloqueo.service.js';
import { FlujoInstanceService } from '@flujos-services-flujo/flujo-instance.service.js';

@Controller('flujos')
export class FlujosController {
  constructor(
    private readonly instances: FlujoInstanceService,
    private readonly menu: MenuBloqueoService,
  ) {}

  @Put('menu/bloqueo')
  @Authorized.roles('superusuario')
  public setMenuLock(@Body(new ZodValidationPipe(MenuBloqueoSchema)) body: MenuBloqueoInput, @Req() request: Request): Promise<{ bloqueo: boolean }> {
    return this.menu.setLocked(request.user!.sub, body.bloqueo);
  }

  @Post(':flujoId/instancias')
  @Authorized.session()
  public start(
    @Param('flujoId', new ZodValidationPipe(FlujoIdSchema)) flujoId: string,
    @Body(new ZodValidationPipe(FlujoIniciarSchema)) body: FlujoIniciarInput,
    @Req() request: Request,
  ): Promise<{ id: string }> {
    return this.instances.start(flujoId, body.auditoriaId, request.user!, RequestRole.resolve(request));
  }

  @Post('instancias/:id/concluir')
  @HttpCode(HttpStatus.OK)
  @Authorized.session()
  public conclude(
    @Param('id', new ZodValidationPipe(InstanciaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<{ id: string }> {
    return this.instances.conclude(id, request.user!, RequestRole.resolve(request));
  }
}

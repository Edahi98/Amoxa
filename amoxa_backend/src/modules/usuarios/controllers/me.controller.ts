import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { BearerToken } from '@auth-token/bearer-token.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { PasswordChangeSchema, type PasswordChangeInput } from '@validators-usuarios/password-change.schema.js';
import { UsuarioUpdateSchema, type UsuarioUpdateInput } from '@validators-usuarios/usuario-update.schema.js';
import { UsuarioProfileService } from '@usuarios-services-usuario/usuario-profile.service.js';
import type { UsuarioView } from '@usuarios-services-usuario/usuario-view.js';

@Controller('me')
@Authorized.session()
export class MeController {
  constructor(private readonly profile: UsuarioProfileService) {}

  @Get()
  public me(@Req() request: Request): Promise<UsuarioView> {
    return this.profile.get(request.user!.sub);
  }

  @Patch()
  public update(
    @Body(new ZodValidationPipe(UsuarioUpdateSchema)) body: UsuarioUpdateInput,
    @Req() request: Request,
  ): Promise<UsuarioView> {
    return this.profile.update(request.user!, body, request.ip ?? null);
  }

  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  public changePassword(
    @Body(new ZodValidationPipe(PasswordChangeSchema)) body: PasswordChangeInput,
    @Req() request: Request,
  ): Promise<void> {
    return this.profile.changePassword(request.user!, BearerToken.from(request), body, request.ip ?? null);
  }
}

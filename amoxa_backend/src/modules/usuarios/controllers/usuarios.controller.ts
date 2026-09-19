import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { UsuarioCreateSchema, type UsuarioCreateInput } from '@validators-usuarios/usuario-create.schema.js';
import { UsuarioIdSchema } from '@validators-usuarios/usuario-id.schema.js';
import { UsuarioListQuerySchema, type UsuarioListQuery } from '@validators-usuarios/usuario-list-query.schema.js';
import { UsuarioRoleSchema, type UsuarioRoleInput } from '@validators-usuarios/usuario-role.schema.js';
import { UsuarioStatusSchema, type UsuarioStatusInput } from '@validators-usuarios/usuario-status.schema.js';
import { UsuarioUpdateSchema, type UsuarioUpdateInput } from '@validators-usuarios/usuario-update.schema.js';
import { UsuarioAdminService, type UsuarioInvitado } from '@usuarios-services-usuario/usuario-admin.service.js';
import { UsuarioQueryService, type UsuarioPage } from '@usuarios-services-usuario/usuario-query.service.js';
import type { UsuarioView } from '@usuarios-services-usuario/usuario-view.js';

@Controller('usuarios')
@Authorized.roles('superusuario')
export class UsuariosController {
  constructor(
    private readonly query: UsuarioQueryService,
    private readonly admin: UsuarioAdminService,
  ) {}

  @Get()
  public list(@Query(new ZodValidationPipe(UsuarioListQuerySchema)) query: UsuarioListQuery): Promise<UsuarioPage> {
    return this.query.list(query);
  }

  @Get(':id')
  public detail(@Param('id', new ZodValidationPipe(UsuarioIdSchema)) id: string): Promise<UsuarioView> {
    return this.query.get(id);
  }

  @Post()
  public create(
    @Body(new ZodValidationPipe(UsuarioCreateSchema)) body: UsuarioCreateInput,
    @Req() request: Request,
  ): Promise<UsuarioInvitado> {
    return this.admin.create(body, request.user!, request.ip ?? null);
  }

  @Post(':id/invite')
  public invite(
    @Param('id', new ZodValidationPipe(UsuarioIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<UsuarioInvitado> {
    return this.admin.invite(id, request.user!, request.ip ?? null);
  }

  @Patch(':id')
  public update(
    @Param('id', new ZodValidationPipe(UsuarioIdSchema)) id: string,
    @Body(new ZodValidationPipe(UsuarioUpdateSchema)) body: UsuarioUpdateInput,
    @Req() request: Request,
  ): Promise<UsuarioView> {
    return this.admin.update(id, body, request.user!, request.ip ?? null);
  }

  @Patch(':id/role')
  public changeRole(
    @Param('id', new ZodValidationPipe(UsuarioIdSchema)) id: string,
    @Body(new ZodValidationPipe(UsuarioRoleSchema)) body: UsuarioRoleInput,
    @Req() request: Request,
  ): Promise<UsuarioView> {
    return this.admin.changeRole(id, body.rol, request.user!, request.ip ?? null);
  }

  @Patch(':id/status')
  public changeStatus(
    @Param('id', new ZodValidationPipe(UsuarioIdSchema)) id: string,
    @Body(new ZodValidationPipe(UsuarioStatusSchema)) body: UsuarioStatusInput,
    @Req() request: Request,
  ): Promise<UsuarioView> {
    return this.admin.changeStatus(id, body.activo, request.user!, request.ip ?? null);
  }
}

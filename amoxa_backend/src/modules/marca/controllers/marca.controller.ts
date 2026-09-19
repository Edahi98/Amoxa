import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { MarcaGuardarSchema, type MarcaGuardarInput } from '@validators-marca/marca-guardar.schema.js';
import { MarcaService, type MarcaView } from '@marca-services/marca.service.js';

@Controller('marca')
export class MarcaController {
  constructor(private readonly marca: MarcaService) {}

  @Get()
  @Authorized.permissions('marca.editar')
  public get(@Req() request: Request): Promise<MarcaView> {
    return this.marca.get(request.user!.organizacionId);
  }

  @Put()
  @Authorized.permissions('marca.editar')
  public save(@Body(new ZodValidationPipe(MarcaGuardarSchema)) body: MarcaGuardarInput, @Req() request: Request): Promise<MarcaView> {
    return this.marca.save(request.user!.organizacionId, body, request.user!, request.ip ?? null);
  }

  @Post('logo/quitar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('marca.editar')
  public removeLogo(@Req() request: Request): Promise<MarcaView> {
    return this.marca.removeLogo(request.user!.organizacionId, request.user!, request.ip ?? null);
  }
}

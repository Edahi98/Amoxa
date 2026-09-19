import { Body, Controller, Get, Param, Post, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { CrearHallazgoSchema, type CrearHallazgoInput } from '@validators-ejecucion/crear-hallazgo.schema.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import { EjecucionDocumentoService } from '@ejecucion-documentos/ejecucion-documento.service.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import type { HallazgoView } from '@ejecucion-hallazgos/hallazgo-view.js';

@Controller('auditorias')
export class HallazgosController {
  constructor(
    private readonly hallazgos: HallazgoService,
    private readonly documentos: EjecucionDocumentoService,
  ) {}

  @Get(':id/hallazgos/documento')
  @Authorized.anyPermission('hallazgo.registrar', 'hallazgo.revisar', 'ejecucion.aceptar_o_discrepar_cierre')
  public async documento(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return DocxResponder.stream(response, await this.documentos.hallazgosDocument(id, RequestUser.of(request)));
  }

  @Get(':id/hallazgos')
  @Authorized.anyPermission('hallazgo.registrar', 'hallazgo.revisar', 'ejecucion.aceptar_o_discrepar_cierre')
  public async listar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Req() request: Request,
  ): Promise<HallazgoView[]> {
    return this.hallazgos.list(id, RequestUser.of(request));
  }

  @Post(':id/hallazgos')
  @Authorized.permissions('hallazgo.registrar')
  public async crear(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(CrearHallazgoSchema)) body: CrearHallazgoInput,
    @Req() request: Request,
  ): Promise<HallazgoView> {
    return this.hallazgos.create(id, RequestUser.of(request), body);
  }
}

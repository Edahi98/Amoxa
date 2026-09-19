import { Controller, Get, Param, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { TipoReunionParamSchema, type TipoReunion } from '@validators-ejecucion/tipo-reunion-param.schema.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import { EjecucionDocumentoService } from '@ejecucion-documentos/ejecucion-documento.service.js';
import { ReunionService } from '@ejecucion-reuniones/reunion.service.js';
import type { ReunionView } from '@ejecucion-reuniones/reunion-view.js';

@Controller('auditorias')
export class ReunionesController {
  constructor(
    private readonly reuniones: ReunionService,
    private readonly documentos: EjecucionDocumentoService,
  ) {}

  @Get(':id/reuniones/:tipo/documento')
  @Authorized.anyPermission(
    'ejecucion.presidir_apertura',
    'ejecucion.asistir_apertura',
    'ejecucion.presentar_cierre',
    'ejecucion.asistir_cierre',
    'ejecucion.aceptar_o_discrepar_cierre',
  )
  public async documento(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('tipo', new ZodValidationPipe(TipoReunionParamSchema)) tipo: TipoReunion,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return DocxResponder.stream(response, await this.documentos.actaDocument(id, tipo, RequestUser.of(request)));
  }

  @Get(':id/reuniones/:tipo')
  @Authorized.anyPermission(
    'ejecucion.presidir_apertura',
    'ejecucion.asistir_apertura',
    'ejecucion.presentar_cierre',
    'ejecucion.asistir_cierre',
    'ejecucion.aceptar_o_discrepar_cierre',
  )
  public async ver(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('tipo', new ZodValidationPipe(TipoReunionParamSchema)) tipo: TipoReunion,
    @Req() request: Request,
  ): Promise<ReunionView> {
    return this.reuniones.view(id, tipo, RequestUser.of(request));
  }
}

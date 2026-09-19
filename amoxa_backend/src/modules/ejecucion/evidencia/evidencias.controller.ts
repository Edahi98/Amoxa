import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { SubirEvidenciaSchema, type SubirEvidenciaInput } from '@validators-ejecucion/subir-evidencia.schema.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { VerificarEvidenciaSchema, type VerificarEvidenciaInput } from '@validators-ejecucion/verificar-evidencia.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import { EvidenceFindingState } from '@ejecucion-evidencia/evidence-finding-state.js';
import { EvidenceResponder } from '@ejecucion-evidencia/evidence-responder.js';
import { EvidenceService, type DeclaredEvidenceResult } from '@ejecucion-evidencia/evidence.service.js';
import { EvidenceUploadOptions } from '@ejecucion-evidencia/evidence-upload-options.js';
import type { EvidenceView } from '@ejecucion-evidencia/evidence-view.js';
import type { UploadedEvidence } from '@ejecucion-evidencia/uploaded-evidence.js';

@Controller('auditorias')
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenceService) {}

  @Get(':id/respuestas/:respuestaId/evidencias')
  @Authorized.anyPermission('evidencia.capturar', 'ejecucion.responder_checklist', 'hallazgo.revisar')
  public async listar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('respuestaId', new ZodValidationPipe(UuidParamSchema)) respuestaId: string,
    @Req() request: Request,
  ): Promise<EvidenceView[]> {
    return this.evidencias.list(id, respuestaId, RequestUser.of(request));
  }

  @Get(':id/respuestas/:respuestaId/evidencia-verificada')
  @Authorized.anyPermission('hallazgo.registrar', 'evidencia.capturar', 'ejecucion.responder_checklist', 'hallazgo.revisar')
  public async estadoParaHallazgo(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('respuestaId', new ZodValidationPipe(UuidParamSchema)) respuestaId: string,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    const state = await this.evidencias.verificationOf(id, respuestaId, RequestUser.of(request));
    return EvidenceFindingState.from(state);
  }

  @Post(':id/respuestas/:respuestaId/evidencias')
  @Authorized.permissions('evidencia.capturar')
  @UseInterceptors(FileInterceptor('archivo', EvidenceUploadOptions.build()))
  public async subir(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('respuestaId', new ZodValidationPipe(UuidParamSchema)) respuestaId: string,
    @Body(new ZodValidationPipe(SubirEvidenciaSchema)) body: SubirEvidenciaInput,
    @Req() request: Request,
    @UploadedFile() archivo?: UploadedEvidence,
  ): Promise<EvidenceView | DeclaredEvidenceResult> {
    const user = RequestUser.of(request);
    if (archivo !== undefined) {
      return this.evidencias.storeFile(id, respuestaId, user, archivo, body);
    }
    return this.evidencias.storeDeclared(id, respuestaId, user, body);
  }

  @Get(':id/respuestas/:respuestaId/evidencias/:adjuntoId/archivo')
  @Authorized.anyPermission('evidencia.capturar', 'ejecucion.responder_checklist', 'hallazgo.revisar')
  public async archivo(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('respuestaId', new ZodValidationPipe(UuidParamSchema)) respuestaId: string,
    @Param('adjuntoId', new ZodValidationPipe(UuidParamSchema)) adjuntoId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const served = await this.evidencias.read(id, respuestaId, adjuntoId, RequestUser.of(request));
    return EvidenceResponder.stream(response, served);
  }

  @Post(':id/respuestas/:respuestaId/verificacion')
  @Authorized.permissions('evidencia.capturar')
  public async verificar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Param('respuestaId', new ZodValidationPipe(UuidParamSchema)) respuestaId: string,
    @Body(new ZodValidationPipe(VerificarEvidenciaSchema)) body: VerificarEvidenciaInput,
    @Req() request: Request,
  ): Promise<{ respuestaId: string; verificada: boolean; archivos: number }> {
    const verificada = body.evidencia?.verificada ?? body.verificada ?? true;
    return this.evidencias.verify(id, respuestaId, RequestUser.of(request), verificada);
  }
}

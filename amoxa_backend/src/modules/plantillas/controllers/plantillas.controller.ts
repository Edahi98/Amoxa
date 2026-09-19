import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { PlantillaBodySchema, type PlantillaBody } from '@validators-plantillas/plantilla-body.schema.js';
import { PlantillaIdSchema } from '@validators-plantillas/plantilla-id.schema.js';
import { PreguntaBodySchema, type PreguntaBody } from '@validators-plantillas/pregunta-body.schema.js';
import { PropuestaIdSchema } from '@validators-plantillas/propuesta-id.schema.js';
import { ImportarBodySchema, type ImportarBody } from '@validators-plantillas/importar-body.schema.js';
import { OrdenBodySchema, type OrdenBody } from '@validators-plantillas/orden-body.schema.js';
import { PlantillaImportService, type ImportResult } from '@plantillas-importacion/plantilla-import.service.js';
import { PlantillaMapper } from '@plantillas-mappers-plantilla/plantilla-mapper.js';
import type { PlantillaSummary, PlantillaView, PropuestaRow } from '@plantillas-mappers-plantilla/plantilla-view.js';
import { PlantillaDocumentService } from '@plantillas-services-plantilla/plantilla-document.service.js';
import { PlantillaQueryService, type PlantillaViewer } from '@plantillas-services-plantilla/plantilla-query.service.js';
import { PlantillasService } from '@plantillas-services/plantillas.service.js';

@Controller('plantillas')
export class PlantillasController {
  constructor(
    private readonly plantillas: PlantillasService,
    private readonly query: PlantillaQueryService,
    private readonly documents: PlantillaDocumentService,
    private readonly importer: PlantillaImportService,
  ) {}

  @Get()
  @Authorized.permissions('plantilla.consultar')
  public async list(@Req() request: Request): Promise<PlantillaSummary[]> {
    const entries = await this.query.list(request.user!.organizacionId, this.viewer(request));
    return entries.map((entry) => PlantillaMapper.toSummary(entry.row, entry.preguntas));
  }

  @Get('vigentes')
  @Authorized.permissions('plantilla.consultar')
  public async eligible(@Req() request: Request): Promise<PlantillaSummary[]> {
    const rows = await this.query.eligible(request.user!.organizacionId);
    return Promise.all(
      rows.map(async (row) => PlantillaMapper.toSummary(row, await this.query.questions(row.id))),
    );
  }

  @Get(':id')
  @Authorized.permissions('plantilla.consultar')
  public async detail(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return PlantillaMapper.toView(await this.query.detail(id, request.user!.organizacionId, this.viewer(request)));
  }

  @Get(':id/formato')
  @Authorized.permissions('plantilla.consultar')
  public async format(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.checklistFormat(id, request.user!.organizacionId, this.viewer(request));
    return DocxResponder.stream(response, file);
  }

  @Post()
  @Authorized.permissions('plantilla.crear')
  public create(
    @Body(new ZodValidationPipe(PlantillaBodySchema)) body: PlantillaBody,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.create(request.user!, body);
  }

  @Put(':id')
  @Authorized.permissions('plantilla.editar')
  public update(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Body(new ZodValidationPipe(PlantillaBodySchema)) body: PlantillaBody,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.update(id, request.user!, body);
  }

  @Post(':id/preguntas')
  @Authorized.permissions('plantilla.editar')
  public addQuestion(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Body(new ZodValidationPipe(PreguntaBodySchema)) body: PreguntaBody,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.addQuestion(id, request.user!, body);
  }

  @Post(':id/propuestas')
  @Authorized.permissions('plantilla.proponer')
  public propose(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Body(new ZodValidationPipe(PreguntaBodySchema)) body: PreguntaBody,
    @Req() request: Request,
  ): Promise<PropuestaRow> {
    return this.plantillas.propose(id, request.user!, RequestRole.resolve(request), body);
  }

  @Put(':id/preguntas/orden')
  @Authorized.permissions('plantilla.editar')
  public reorder(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Body(new ZodValidationPipe(OrdenBodySchema)) body: OrdenBody,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.reorder(id, request.user!, body.preguntas.map((item) => item.id));
  }

  @Post(':id/importar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('plantilla.editar')
  public importQuestions(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Body(new ZodValidationPipe(ImportarBodySchema)) body: ImportarBody,
    @Req() request: Request,
  ): Promise<ImportResult> {
    return this.importer.import(id, request.user!, RequestRole.resolve(request), body);
  }

  @Post(':id/propuestas/aceptar-todas')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('plantilla.editar')
  public acceptAll(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<{ resueltas: number }> {
    return this.importer.resolveAll(id, request.user!, 'aceptar');
  }

  @Post(':id/propuestas/rechazar-todas')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('plantilla.editar')
  public rejectAll(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<{ resueltas: number }> {
    return this.importer.resolveAll(id, request.user!, 'rechazar');
  }

  @Post(':id/propuestas/:propuestaId/aceptar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('plantilla.editar')
  public acceptProposal(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Param('propuestaId', new ZodValidationPipe(PropuestaIdSchema)) proposalId: string,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.acceptProposal(id, proposalId, request.user!);
  }

  @Post(':id/propuestas/:propuestaId/rechazar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('plantilla.editar')
  public rejectProposal(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Param('propuestaId', new ZodValidationPipe(PropuestaIdSchema)) proposalId: string,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.rejectProposal(id, proposalId, request.user!);
  }

  @Post(':id/publicar')
  @HttpCode(HttpStatus.OK)
  @Authorized.permissions('plantilla.publicar')
  public publish(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.publish(id, request.user!);
  }

  @Post(':id/version')
  @Authorized.permissions('plantilla.editar')
  public newVersion(
    @Param('id', new ZodValidationPipe(PlantillaIdSchema)) id: string,
    @Req() request: Request,
  ): Promise<PlantillaView> {
    return this.plantillas.newVersion(id, request.user!);
  }

  private viewer(request: Request): PlantillaViewer {
    return { role: RequestRole.resolve(request), userId: request.user!.sub };
  }
}

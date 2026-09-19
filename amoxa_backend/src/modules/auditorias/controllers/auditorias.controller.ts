import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { DocxResponder } from '@docx/docx-responder.js';
import { AlcanceRevisionSchema, type AlcanceRevisionInput } from '@validators-auditorias-alcance/alcance-revision.schema.js';
import { AlcanceSchema, type AlcanceInput } from '@validators-auditorias-alcance/alcance.schema.js';
import { ContactoConfirmacionSchema, type ContactoConfirmacionInput } from '@validators-auditorias-contacto/contacto-confirmacion.schema.js';
import { ContactoRespuestaSchema, type ContactoRespuestaInput } from '@validators-auditorias-contacto/contacto-respuesta.schema.js';
import { EquipoSchema, type EquipoInput } from '@validators-auditorias/equipo.schema.js';
import { PlanPropuestaSchema, type PlanPropuestaInput } from '@validators-auditorias-plan/plan-propuesta.schema.js';
import { PlanSchema, type PlanInput } from '@validators-auditorias-plan/plan.schema.js';
import { ProgramaFilterSchema } from '@validators-auditorias/programa-filter.schema.js';
import { UuidParamSchema } from '@validators-auditorias/uuid-param.schema.js';
import type { AuditoriaDetalle, AuditoriaResumen } from '@auditorias-types/auditoria-detalle.js';
import { AlcanceService } from '@auditorias-services/alcance-service.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaDocuments } from '@auditorias-services-auditoria/auditoria-documents.js';
import { AuditoriaReader } from '@auditorias-services-auditoria/auditoria-reader.js';
import { ContactoService } from '@auditorias-services/contacto-service.js';
import { EquipoService } from '@auditorias-services/equipo-service.js';
import { PlanService } from '@auditorias-services/plan-service.js';

const idPipe = new ZodValidationPipe(UuidParamSchema);

@Controller('auditorias')
export class AuditoriasController {
  constructor(
    private readonly reader: AuditoriaReader,
    private readonly access: AuditoriaAccess,
    private readonly alcance: AlcanceService,
    private readonly contacto: ContactoService,
    private readonly equipo: EquipoService,
    private readonly plan: PlanService,
    private readonly documents: AuditoriaDocuments,
  ) {}

  @Get()
  @Authorized.anyPermission('auditoria.consultar', 'auditoria.consultar_asignadas', 'auditoria.consultar_area')
  public async list(
    @Req() request: Request,
    @Query('programaId', new ZodValidationPipe(ProgramaFilterSchema)) programaId: string | undefined,
  ): Promise<AuditoriaResumen[]> {
    return this.reader.list(request.user!, RequestRole.resolve(request), { programaId });
  }

  @Get(':id')
  @Authorized.anyPermission('auditoria.consultar', 'auditoria.consultar_asignadas', 'auditoria.consultar_area')
  public async detail(@Param('id', idPipe) id: string, @Req() request: Request): Promise<AuditoriaDetalle> {
    return this.access.visible(id, request.user!, RequestRole.resolve(request));
  }

  @Put(':id/alcance')
  @Authorized.permissions('auditoria.definir_alcance')
  public async defineScope(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(AlcanceSchema)) input: AlcanceInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.alcance.define(id, input, request.user!);
  }

  @Post(':id/alcance/revision')
  @Authorized.permissions('auditoria.revisar_alcance')
  public async reviewScope(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(AlcanceRevisionSchema)) input: AlcanceRevisionInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.alcance.review(id, input, request.user!);
  }

  @Post(':id/contacto/confirmacion')
  @Authorized.permissions('auditoria.confirmar_contacto')
  public async confirmContact(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(ContactoConfirmacionSchema)) input: ContactoConfirmacionInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.contacto.confirm(id, input, request.user!);
  }

  @Post(':id/contacto/respuesta')
  @Authorized.permissions('auditoria.responder_contacto')
  public async respondContact(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(ContactoRespuestaSchema)) input: ContactoRespuestaInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.contacto.respond(id, input, request.user!);
  }

  @Put(':id/equipo')
  @Authorized.permissions('auditoria.asignar_equipo')
  public async assignTeam(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(EquipoSchema)) input: EquipoInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.equipo.assign(id, input, request.user!);
  }

  @Put(':id/plan')
  @Authorized.permissions('auditoria.elaborar_plan')
  public async savePlan(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(PlanSchema)) input: PlanInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.plan.save(id, input, request.user!);
  }

  @Post(':id/plan/envio')
  @Authorized.permissions('auditoria.elaborar_plan')
  public async sendPlan(@Param('id', idPipe) id: string, @Req() request: Request): Promise<AuditoriaDetalle> {
    return this.plan.send(id, request.user!);
  }

  @Post(':id/plan/propuesta')
  @Authorized.permissions('auditoria.aprobar_plan')
  public async proposeDate(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(PlanPropuestaSchema)) input: PlanPropuestaInput,
    @Req() request: Request,
  ): Promise<AuditoriaDetalle> {
    return this.plan.propose(id, input, request.user!);
  }

  @Post(':id/plan/aprobacion')
  @Authorized.permissions('auditoria.aprobar_plan')
  public async approvePlan(@Param('id', idPipe) id: string, @Req() request: Request): Promise<AuditoriaDetalle> {
    return this.plan.approve(id, request.user!);
  }

  @Get(':id/plan/documento')
  @Authorized.anyPermission('auditoria.consultar', 'auditoria.consultar_plan', 'auditoria.consultar_area')
  public async planDocument(
    @Param('id', idPipe) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return DocxResponder.stream(response, await this.documents.plan(id, request.user!, RequestRole.resolve(request)));
  }

  @Get(':id/notificacion/documento')
  @Authorized.anyPermission('auditoria.consultar', 'auditoria.consultar_plan', 'auditoria.consultar_area')
  public async notificationDocument(
    @Param('id', idPipe) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return DocxResponder.stream(response, await this.documents.notification(id, request.user!, RequestRole.resolve(request)));
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AccionAccess } from '@acciones-rules-accion/accion-access.js';
import type { AccionDetalle } from '@acciones-rules-accion/accion-detalle.types.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';
import { VerifierEligibility } from '@acciones-rules/verifier-eligibility.js';
import { AccionHallazgoLookupService } from '@acciones-services-accion/accion-hallazgo-lookup.service.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';

@Injectable()
@ScreenDataDecorator.of('accion.lista', 'accion.crear', 'accion.cierre', 'accion.verificar')
export class AccionScreenProvider extends ScreenDataProvider {
  constructor(
    private readonly queries: AccionQueryService,
    private readonly loader: AccionLoaderService,
    private readonly lookup: AccionHallazgoLookupService,
    private readonly versions: RecordVersionService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (request.screenId === 'accion.lista') {
      return this.list(request);
    }
    if (request.screenId === 'accion.crear') {
      return this.create(request);
    }
    return this.single(request);
  }

  private async list(request: ScreenDataRequest): Promise<ScreenData> {
    const items = await this.queries.list(request.user, request.role);
    return {
      data: {
        acciones: items.map((item) => ({
          id: item.id,
          title: item.descripcion,
          description: [item.proceso, item.responsable, DeadlineCalculator.describe(item.diasRestantes)].filter((part) => part !== '').join(' · '),
          status: item.estado,
          estado: item.estado,
          dias_restantes: item.diasRestantes,
        })),
      },
    };
  }

  private async create(request: ScreenDataRequest): Promise<ScreenData> {
    const found = await this.lookup.find(request.entityId, request.user);
    const responsables = await this.lookup.responsables(request.user.organizacionId);
    const options = responsables.map((item) => ({ value: item.id, label: item.nombre, description: item.rol === 'auditor' ? 'Auditor' : 'Dueño de proceso' }));
    if (found === undefined) {
      return { data: { accion: AccionScreenProvider.emptyForm(), opciones: { responsables: options } } };
    }
    const history = await this.versions.history('hallazgo', found.id);
    const days = DeadlineCalculator.daysLeft(found.accionFechaLimite, new Date());
    return {
      entity: { type: 'hallazgo', id: found.id, version: history[0]?.version ?? 1, estado: found.estado },
      data: {
        hallazgo: {
          id: found.id,
          title: `No conformidad en ${found.proceso}`,
          description: found.descripcion,
          kind: found.clasificacion === 'mayor' ? 'nc_mayor' : 'nc_menor',
          clause: found.criterio ?? undefined,
          process: found.proceso,
          status: found.estado,
        },
        accion: { ...AccionScreenProvider.emptyForm(), dias_restantes: DeadlineCalculator.describe(days) },
        opciones: { responsables: options },
      },
    };
  }

  private async single(request: ScreenDataRequest): Promise<ScreenData> {
    const detail = await this.resolve(request);
    if (detail === undefined) {
      return { data: { accion: {} } };
    }
    const card = AccionScreenProvider.card(detail);
    const history = await this.versions.history('accion', detail.id);
    const entity = { type: 'accion', id: detail.id, version: history[0]?.version ?? 1, estado: detail.estado };
    if (request.screenId === 'accion.cierre') {
      return { entity, data: { accion: { ...card, evidencias: [], comentario_cierre: '' } } };
    }
    return {
      entity,
      data: {
        accion: { ...card, verificador_es_responsable: !VerifierEligibility.isEligible(request.user.sub, detail.responsableId) },
        verificacion: { eficaz: true, evidencias: [], comentario: '', nueva_fecha: '' },
      },
    };
  }

  private async resolve(request: ScreenDataRequest): Promise<AccionDetalle | undefined> {
    const now = new Date();
    let id = request.entityId;
    if (id === undefined) {
      const items = await this.queries.list(request.user, request.role, { estado: request.screenId === 'accion.verificar' ? 'reportada' : undefined });
      const open = items.find((item) => request.screenId === 'accion.verificar' || ['abierta', 'reabierta', 'vencida'].includes(item.estado));
      id = open?.id;
    }
    if (id === undefined || !/^[0-9a-f-]{36}$/i.test(id)) {
      return undefined;
    }
    if (request.screenId === 'accion.verificar') {
      const detail = await this.loader.detail(id, request.user.organizacionId, now);
      if (detail.estado !== 'reportada' && detail.responsableId !== request.user.sub) {
        throw new ForbiddenException('No tiene acceso a esta acción.');
      }
      return detail;
    }
    const detail = await this.loader.detail(id, request.user.organizacionId, now);
    if (!AccionAccess.canRead(detail, request.role, request.user.sub)) {
      throw new ForbiddenException('No tiene acceso a esta acción.');
    }
    return detail;
  }

  private static emptyForm(): Record<string, string> {
    return { correccion: '', causa_raiz: '', responsable_id: '', fecha_limite: '', dias_restantes: '' };
  }

  private static card(detail: AccionDetalle): Record<string, unknown> {
    return {
      id: detail.id,
      title: detail.descripcion,
      owner: detail.responsableNombre,
      dueDate: detail.fechaLimite ?? undefined,
      status: detail.estado,
      daysLeft: detail.diasRestantes ?? undefined,
      requiresVerification: detail.estado === 'reportada',
      dias_restantes: DeadlineCalculator.describe(detail.diasRestantes),
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, ne, notInArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, flujoInstancia, plantillaChecklist } from '@schemas/index.js';
import { WorkflowCatalog } from '@shared-workflow/workflow-catalog.js';
import { AuditVisibility } from '@registros-consulta/audit-visibility.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { FlujoInstanceService } from '@flujos-services-flujo/flujo-instance.service.js';
import type { FlowState, StepState } from '@flujos-services-flujo/flujo-progress.service.js';

@Injectable()
@ScreenDataDecorator.of('flujo.lista', 'flujo.guia', 'flujo.avance')
export class FlujoScreenProvider extends ScreenDataProvider {
  private static readonly STEP_LABELS: Readonly<Record<StepState, string>> = {
    completado: 'Completado',
    en_curso: 'En curso',
    pendiente: 'Pendiente',
  };

  private static readonly FLOW_LABELS: Readonly<Record<FlowState, string>> = {
    en_curso: 'En curso',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
  };

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly instances: FlujoInstanceService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    switch (request.screenId) {
      case 'flujo.lista':
        return this.list(request);
      case 'flujo.guia':
        return this.guide(request);
      default:
        return this.progress(request);
    }
  }

  private async list(request: ScreenDataRequest): Promise<ScreenData> {
    const views = await this.instances.list(request.user, request.role);
    return {
      data: {
        flujos: WorkflowCatalog.summaries(),
        instancias: views.map(({ instance, progress }) => ({
          id: instance.id,
          flujo: WorkflowCatalog.find(instance.flujoId)?.title ?? instance.flujoId,
          auditoria: progress.auditoriaNombre,
          paso: progress.steps.find((step) => step.id === progress.currentStepId)?.title ?? '—',
          avance: `${progress.completed} de ${progress.total}`,
          estado: FlujoScreenProvider.FLOW_LABELS[progress.state],
        })),
      },
    };
  }

  private async guide(request: ScreenDataRequest): Promise<ScreenData> {
    if (WorkflowCatalog.find(request.entityId) === undefined) {
      return {};
    }
    return {
      entity: { type: 'flujo', id: request.entityId!, version: 1 },
      data: {
        inicio: { auditoria_id: '' },
        opciones: { auditorias: await this.startable(request, request.entityId!) },
      },
    };
  }

  private async progress(request: ScreenDataRequest): Promise<ScreenData> {
    if (request.entityId === undefined) {
      return {};
    }
    const { instance, progress } = await this.instances.get(request.entityId, request.user, request.role);
    const workflow = WorkflowCatalog.find(instance.flujoId)!;
    return {
      entity: { type: 'flujo_instancia', id: instance.id, version: 1 },
      data: {
        avance: {
          flujo_id: instance.flujoId,
          titulo: workflow.title,
          auditoria: `Auditoría: ${progress.auditoriaNombre}`,
          estado: FlujoScreenProvider.FLOW_LABELS[progress.state],
          porcentaje: Math.round((progress.completed / progress.total) * 100),
          paso_actual: progress.currentStepId ?? '',
          detalle_actual: progress.steps.find((step) => step.id === progress.currentStepId)?.detail ?? 'No quedan pasos pendientes.',
          auditoria_id: progress.auditoriaId,
          plantilla_id: progress.plantillaId,
          puede_concluir: progress.canConclude,
          pasos: progress.steps.map((step, index) => ({
            id: step.id,
            paso: `${index + 1}. ${step.title}`,
            estado: FlujoScreenProvider.STEP_LABELS[step.state],
            detalle: step.detail,
          })),
        },
      },
    };
  }

  private async startable(request: ScreenDataRequest, flujoId: string) {
    const active = this.db
      .select({ id: flujoInstancia.auditoriaId })
      .from(flujoInstancia)
      .where(and(eq(flujoInstancia.flujoId, flujoId), isNull(flujoInstancia.completadoEn)));
    const rows = await this.db
      .select({ id: auditoria.id, plantilla: plantillaChecklist.nombre, estado: auditoria.estado, fechaPlan: auditoria.fechaPlan })
      .from(auditoria)
      .innerJoin(plantillaChecklist, eq(plantillaChecklist.id, auditoria.plantillaId))
      .where(
        and(
          inArray(auditoria.id, AuditVisibility.auditIds(this.db, request.user, request.role)),
          ne(auditoria.estado, 'cancelada'),
          notInArray(auditoria.id, active),
        ),
      );
    return rows.map((row) => ({
      value: row.id,
      label: row.plantilla,
      description: `Estado: ${row.estado.replace('_', ' ')}${row.fechaPlan ? ` · Plan del ${row.fechaPlan}` : ''}`,
    }));
  }
}

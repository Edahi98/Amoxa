import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ExecutionScreenData } from '@ejecucion-acceso/execution-screen-data.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';

@Injectable()
@ScreenDataDecorator.of('ejecucion.checklist')
export class ChecklistScreenProvider extends ScreenDataProvider {
  constructor(
    private readonly access: AuditoriaAccessService,
    private readonly resumen: AuditoriaResumenService,
    private readonly checklist: ChecklistService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (!ExecutionScreenData.isId(request.entityId)) {
      return { offline: ExecutionScreenData.OFFLINE };
    }
    const context = await this.access.loadAsMember(request.entityId, request.user);
    const view = await this.checklist.build(context);
    const card = ExecutionScreenData.auditCard(await this.resumen.of(context));
    return {
      entity: ExecutionScreenData.entity(context, view.version),
      offline: ExecutionScreenData.OFFLINE,
      data: {
        auditoria: card,
        checklist: {
          avance: view.progreso.avance,
          pendientes: view.progreso.pendientes,
          total: view.progreso.total,
          respondidas: view.progreso.respondidas,
          preguntas: view.preguntas.map((item) => ({
            clave: item.clave,
            texto: item.texto,
            clausula: item.clausula ?? '',
            criterio: item.criterio,
            evidenciaObligatoria: item.evidenciaObligatoria,
          })),
        },
        respuestas: Object.fromEntries(
          view.preguntas.map((item) => [
            item.clave,
            item.respuesta === null
              ? {}
              : {
                  id: item.respuesta.id,
                  result: item.respuesta.result,
                  comment: item.respuesta.comment ?? '',
                  verificada: item.respuesta.verificada,
                  evidencias: item.respuesta.evidencias,
                },
          ]),
        ),
      },
    };
  }
}

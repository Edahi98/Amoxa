import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { ExecutionScreenData } from '@ejecucion-acceso/execution-screen-data.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';

@Injectable()
@ScreenDataDecorator.of('ejecucion.evidencia')
export class EvidenciaScreenProvider extends ScreenDataProvider {
  constructor(
    private readonly access: AuditoriaAccessService,
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
    const answered = view.preguntas.filter((item) => item.respuesta !== null);
    const selected = answered.find((item) => item.respuesta?.result === 'no_conforme') ?? answered[0];
    return {
      entity: ExecutionScreenData.entity(context, view.version),
      offline: ExecutionScreenData.OFFLINE,
      data: {
        evidencia: {
          respuesta_id: selected?.respuesta?.id,
          pregunta: selected === undefined ? 'Responda primero una pregunta del checklist para adjuntarle evidencia.' : selected.texto,
          archivos: selected?.respuesta?.evidencias ?? [],
          verificada: selected?.respuesta?.verificada ?? false,
          opciones_respuestas: answered.map((item) => ({
            value: item.respuesta?.id ?? item.preguntaId,
            label: `${item.orden}. ${ExecutionScreenData.truncate(item.texto)}`,
            ...(item.clausula === null ? {} : { description: `Cláusula ${item.clausula}` }),
          })),
        },
      },
    };
  }
}

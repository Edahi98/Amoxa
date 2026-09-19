import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ExecutionScreenData } from '@ejecucion-acceso/execution-screen-data.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import type { HallazgoView } from '@ejecucion-hallazgos/hallazgo-view.js';
import { ChecklistMapper } from '@ejecucion-reglas-checklist/checklist-mapper.js';
import { FindingRules } from '@ejecucion-reglas/finding-rules.js';

@Injectable()
@ScreenDataDecorator.of('hallazgo.lista')
export class HallazgoScreenProvider extends ScreenDataProvider {
  constructor(
    private readonly access: AuditoriaAccessService,
    private readonly resumen: AuditoriaResumenService,
    private readonly checklist: ChecklistService,
    private readonly hallazgos: HallazgoService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (!ExecutionScreenData.isId(request.entityId)) {
      return {};
    }
    const context = await this.access.loadAsMember(request.entityId, request.user);
    const summary = await this.resumen.of(context);
    const view = await this.checklist.build(context);
    const findings = await this.hallazgos.build(context);
    const answered = view.preguntas.filter((item) => item.respuesta !== null && item.respuesta.result !== 'no_aplica');
    const pending = findings.find((item) => item.revisiones.length === 0) ?? findings[0];

    return {
      entity: ExecutionScreenData.entity(context, view.version),
      data: {
        auditoria: ExecutionScreenData.auditCard(summary),
        hallazgos: findings.map((item) => ({
          id: item.id,
          title: `${FindingRules.label(item.kind)} · ${item.proceso}`,
          description: item.descripcion,
          status: item.estado,
        })),
        hallazgo:
          request.role === 'auditor'
            ? {
                respuesta_id: undefined,
                proceso: summary.procesos.length === 1 ? summary.procesos[0].id : undefined,
                evidencias_verificadas: [],
                opciones_respuestas: answered.map((item) => ({
                  value: item.respuesta?.id ?? item.preguntaId,
                  label: `${item.orden}. ${ExecutionScreenData.truncate(item.texto)}`,
                  description: item.respuesta === null ? undefined : ChecklistMapper.label(this.dbResult(item.respuesta.result)),
                })),
                opciones_procesos: summary.procesos.map((item) => ({ value: item.id, label: item.nombre })),
              }
            : this.card(pending),
        revision: { comentario: '' },
      },
    };
  }

  private card(item: HallazgoView | undefined): Record<string, unknown> {
    if (item === undefined) {
      return {};
    }
    return {
      id: item.id,
      title: FindingRules.label(item.kind),
      description: item.descripcion,
      kind: item.kind,
      clause: item.clausula ?? undefined,
      process: item.proceso,
      status: item.estado,
      evidenceCount: item.evidenciaCount,
    };
  }

  private dbResult(result: 'conforme' | 'no_conforme' | 'no_aplica'): 'C' | 'NC' | 'NA' {
    return ChecklistMapper.toDb(result) ?? 'NA';
  }
}

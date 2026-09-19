import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ExecutionScreenData } from '@ejecucion-acceso/execution-screen-data.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import type { HallazgoView } from '@ejecucion-hallazgos/hallazgo-view.js';
import { ClosureEligibility } from '@ejecucion-reglas/closure-eligibility.js';
import { FindingRules } from '@ejecucion-reglas/finding-rules.js';

@Injectable()
@ScreenDataDecorator.of('ejecucion.cierre')
export class CierreScreenProvider extends ScreenDataProvider {
  private static readonly AREA: Readonly<Record<string, string>> = {
    aceptado: 'El área aceptó',
    discrepa: 'El área discrepó',
  };

  constructor(
    private readonly access: AuditoriaAccessService,
    private readonly resumen: AuditoriaResumenService,
    private readonly hallazgos: HallazgoService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (!ExecutionScreenData.isId(request.entityId)) {
      return {};
    }
    const context = await this.access.loadAsMember(request.entityId, request.user);
    const all = await this.hallazgos.build(context);
    const owned =
      request.role === 'dueno_proceso' ? await this.access.ownedProcessIds(context, request.user.sub) : undefined;
    const visible = owned === undefined ? all : all.filter((item) => owned.includes(item.procesoId));
    const evaluation = ClosureEligibility.evaluate(all);
    const firstPending = visible.find((item) => !item.revisado) ?? visible[0];

    return {
      entity: ExecutionScreenData.entity(context),
      data: {
        auditoria: ExecutionScreenData.auditCard(await this.resumen.of(context)),
        cierre: {
          hallazgos_pendientes: evaluation.pendientes.length,
          puede_cerrar: evaluation.puedeCerrar,
          hallazgo_id: firstPending?.id,
          hallazgos: visible.map((item) => ({
            id: item.id,
            title: `${FindingRules.label(item.kind)} · ${item.proceso}`,
            description: item.descripcion,
            status: this.status(item),
          })),
          opciones_hallazgos: visible.map((item, index) => ({
            value: item.id,
            label: `${index + 1}. ${FindingRules.label(item.kind)} · ${item.proceso}`,
            description: ExecutionScreenData.truncate(item.descripcion),
          })),
        },
      },
    };
  }

  private status(item: HallazgoView): string {
    return item.resultadoArea === null ? 'Sin revisar' : CierreScreenProvider.AREA[item.resultadoArea];
  }
}

import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ExecutionScreenData } from '@ejecucion-acceso/execution-screen-data.js';
import { ReunionService } from '@ejecucion-reuniones/reunion.service.js';

@Injectable()
@ScreenDataDecorator.of('ejecucion.apertura')
export class AperturaScreenProvider extends ScreenDataProvider {
  private static readonly ROLES: Readonly<Record<string, string>> = {
    lider_auditor: 'Líder',
    auditor: 'Auditor',
    auditado: 'Dueño de proceso',
  };

  constructor(
    private readonly access: AuditoriaAccessService,
    private readonly resumen: AuditoriaResumenService,
    private readonly reuniones: ReunionService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (!ExecutionScreenData.isId(request.entityId)) {
      return {};
    }
    const context = await this.access.loadAsMember(request.entityId, request.user);
    const meeting = await this.reuniones.viewOf(context, 'apertura');
    const candidates = await this.reuniones.candidates(context);
    const card = ExecutionScreenData.auditCard(await this.resumen.of(context));
    return {
      entity: ExecutionScreenData.entity(context),
      data: {
        auditoria: card,
        apertura: {
          registrada: meeting.registrada,
          notas: meeting.notas ?? '',
          asistentes: meeting.asistentes.filter((item) => item.rolReunion === 'asiste').map((item) => item.usuarioId),
          asistentes_detalle: meeting.asistentes,
          opciones_asistentes: candidates.map((item) => ({
            value: item.id,
            label: item.nombre,
            description: AperturaScreenProvider.ROLES[item.rol] ?? item.rol,
          })),
        },
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { ROLES } from '@shared/roles.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { SolicitudQueryService } from '@solicitudes-services-solicitud/solicitud-query.service.js';

@Injectable()
@ScreenDataDecorator.of('solicitud.lista')
export class SolicitudScreenProvider extends ScreenDataProvider {
  private static readonly DATE = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

  constructor(private readonly query: SolicitudQueryService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const pendientes = await this.query.pendingFor(request.role);
    const resumen =
      pendientes.length === 0
        ? 'No hay solicitudes pendientes.'
        : `${pendientes.length} ${pendientes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}.`;
    return {
      data: {
        resumen,
        seleccion: { solicitud_id: '' },
        url: '',
        expiresAt: '',
        opciones: {
          solicitudes: pendientes.map((item) => ({
            value: item.id,
            label: `${item.usuario.nombre} · ${item.usuario.email}`,
            description: `${ROLES[item.usuario.rol].label} · ${SolicitudScreenProvider.DATE.format(item.creadaEn)}`,
          })),
        },
      },
    };
  }
}

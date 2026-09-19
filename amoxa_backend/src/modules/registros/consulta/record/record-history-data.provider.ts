import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordIdSchema } from '@validators-registros/record-id.schema.js';
import { RecordHistoryService } from '@registros-consulta-record/record-history.service.js';
import { RecordPresenter } from '@registros-consulta-record/record-presenter.js';

@Injectable()
@ScreenDataDecorator.of('registro.historial')
export class RecordHistoryDataProvider extends ScreenDataProvider {
  constructor(private readonly history: RecordHistoryService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (request.entityId === undefined || !RecordIdSchema.safeParse(request.entityId).success) {
      return {
        data: { registro: { titulo: 'Seleccione un registro desde la búsqueda' }, historial: { versiones: [] } },
      };
    }
    const entries = await this.history.entries(request.user, request.role, request.entityId);
    const view = RecordPresenter.history(entries);
    return {
      data: { registro: view.registro, historial: view.historial },
      entity: { type: 'registro', id: request.entityId, version: entries[0].version },
      offline: { enabled: false },
    };
  }
}

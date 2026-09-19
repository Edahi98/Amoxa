import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordSearchService } from '@registros-consulta-record/record-search.service.js';

@Injectable()
@ScreenDataDecorator.of('registro.buscar')
export class RecordSearchDataProvider extends ScreenDataProvider {
  constructor(private readonly search: RecordSearchService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const page = await this.search.search(request.user, request.role, {});
    return {
      data: {
        busqueda: { texto: '', tipo: '' },
        registros: page.registros,
        total: page.total,
      },
      offline: { enabled: false },
    };
  }
}

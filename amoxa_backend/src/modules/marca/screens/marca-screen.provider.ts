import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { MarcaService } from '@marca-services/marca.service.js';

@Injectable()
@ScreenDataDecorator.of('marca.editar')
export class MarcaScreenProvider extends ScreenDataProvider {
  constructor(private readonly marca: MarcaService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const current = await this.marca.get(request.user.organizacionId);
    return {
      data: {
        marca: { color: current.color, pie: current.pie, logo: null, tiene_logo: current.tieneLogo },
      },
    };
  }
}

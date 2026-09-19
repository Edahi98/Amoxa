import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';

@ScreenDataDecorator.of('programa.lista', 'programa.editar')
export class SampleDataProvider extends ScreenDataProvider {
  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    return { data: { pantalla: request.screenId } };
  }
}

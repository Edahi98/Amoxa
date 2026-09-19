import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData } from '@sdui-data/screen-data.types.js';

@Injectable()
@ScreenDataDecorator.of('acceso.login')
export class LoginDataProvider extends ScreenDataProvider {
  public async load(): Promise<ScreenData> {
    return { data: { email: '', password: '' }, offline: { enabled: false } };
  }
}

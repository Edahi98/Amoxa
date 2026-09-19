import type { ScreenId } from '@shared/roles.js';
import type { ScreenDataProviderConstructor } from '@sdui-data/screen-data-provider.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';

export class ScreenDataDecorator {
  public static of(...screenIds: ScreenId[]) {
    return (target: ScreenDataProviderConstructor): void => {
      ScreenDataRegistry.register(screenIds, target);
    };
  }
}

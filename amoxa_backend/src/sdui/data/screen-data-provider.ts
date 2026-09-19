import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';

export abstract class ScreenDataProvider {
  public abstract load(request: ScreenDataRequest): Promise<ScreenData>;
}

export type ScreenDataProviderConstructor = abstract new (...args: never[]) => ScreenDataProvider;

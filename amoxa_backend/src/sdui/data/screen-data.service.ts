import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';

@Injectable()
export class ScreenDataService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async load(request: ScreenDataRequest): Promise<ScreenData> {
    const providerClass = ScreenDataRegistry.providerFor(request.screenId);
    if (providerClass === undefined) {
      return {};
    }

    const provider = this.moduleRef.get(providerClass, { strict: false });
    if (!(provider instanceof ScreenDataProvider)) {
      throw new Error(`El proveedor de datos de ${request.screenId} no es un ScreenDataProvider`);
    }
    return provider.load(request);
  }
}

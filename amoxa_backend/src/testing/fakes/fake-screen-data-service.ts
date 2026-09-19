import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import type { ScreenDataService } from '@sdui-data/screen-data.service.js';

export class FakeScreenDataService {
  public readonly requests: ScreenDataRequest[] = [];
  private readonly result: ScreenData;

  constructor(result: ScreenData = {}) {
    this.result = result;
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    this.requests.push(request);
    return this.result;
  }

  public asService(): ScreenDataService {
    return this as unknown as ScreenDataService;
  }
}

export interface ScreenMetaModelInit {
  generatedAt?: string;
  etag?: string;
  traceId?: string;
}

export class ScreenMetaModel {
  public readonly generatedAt?: string;
  public readonly etag?: string;
  public readonly traceId?: string;

  constructor(init: ScreenMetaModelInit) {
    this.generatedAt = init.generatedAt;
    this.etag = init.etag;
    this.traceId = init.traceId;
  }
}

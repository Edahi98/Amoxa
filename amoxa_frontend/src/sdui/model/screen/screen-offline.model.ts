import type { ConflictPolicy } from '@sdui-model/sdui-enums';

export interface ScreenOfflineModelInit {
  enabled?: boolean;
  cacheTtlSeconds?: number;
  conflictPolicy?: ConflictPolicy;
}

export class ScreenOfflineModel {
  public readonly enabled?: boolean;
  public readonly cacheTtlSeconds?: number;
  public readonly conflictPolicy?: ConflictPolicy;

  constructor(init: ScreenOfflineModelInit) {
    this.enabled = init.enabled;
    this.cacheTtlSeconds = init.cacheTtlSeconds;
    this.conflictPolicy = init.conflictPolicy;
  }
}

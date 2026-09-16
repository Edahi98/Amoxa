import type { ScreenUserModel } from '@sdui-model-screen/screen-user.model';
import type { ScreenEntityModel } from '@sdui-model-screen/screen-entity.model';
import type { ScreenOfflineModel } from '@sdui-model-screen/screen-offline.model';

export interface ScreenContextModelInit {
  user: ScreenUserModel;
  entity?: ScreenEntityModel;
  clauseRefs?: readonly string[];
  offline?: ScreenOfflineModel;
  data?: Record<string, unknown>;
}

export class ScreenContextModel {
  public readonly user: ScreenUserModel;
  public readonly entity?: ScreenEntityModel;
  public readonly clauseRefs?: readonly string[];
  public readonly offline?: ScreenOfflineModel;
  public readonly data?: Record<string, unknown>;

  constructor(init: ScreenContextModelInit) {
    this.user = init.user;
    this.entity = init.entity;
    this.clauseRefs = init.clauseRefs;
    this.offline = init.offline;
    this.data = init.data;
  }
}

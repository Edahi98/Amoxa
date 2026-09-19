import { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export class ScreenContextFactory {
  public static withData(base: ScreenContextModel, data: Record<string, unknown>): ScreenContextModel {
    return new ScreenContextModel({
      user: base.user,
      entity: base.entity,
      clauseRefs: base.clauseRefs,
      offline: base.offline,
      data,
    });
  }
}

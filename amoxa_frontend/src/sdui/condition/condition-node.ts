import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export abstract class ConditionNode {
  public abstract evaluate(context: ScreenContextModel): boolean;
}

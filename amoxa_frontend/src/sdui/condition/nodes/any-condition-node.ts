import { ConditionNode } from '@sdui-condition/condition-node';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export class AnyConditionNode extends ConditionNode {
  private readonly children: readonly ConditionNode[];

  constructor(children: readonly ConditionNode[]) {
    super();
    this.children = children;
  }

  public override evaluate(context: ScreenContextModel): boolean {
    return this.children.some((child) => child.evaluate(context));
  }
}

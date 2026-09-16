import { ConditionNode } from '@sdui-condition/condition-node';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export class AllConditionNode extends ConditionNode {
  private readonly children: readonly ConditionNode[];

  constructor(children: readonly ConditionNode[]) {
    super();
    this.children = children;
  }

  public override evaluate(context: ScreenContextModel): boolean {
    return this.children.every((child) => child.evaluate(context));
  }
}

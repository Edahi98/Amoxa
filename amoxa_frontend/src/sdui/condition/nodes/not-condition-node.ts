import { ConditionNode } from '@sdui-condition/condition-node';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export class NotConditionNode extends ConditionNode {
  private readonly child: ConditionNode;

  constructor(child: ConditionNode) {
    super();
    this.child = child;
  }

  public override evaluate(context: ScreenContextModel): boolean {
    return !this.child.evaluate(context);
  }
}

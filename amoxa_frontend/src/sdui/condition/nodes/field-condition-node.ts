import { ConditionNode } from '@sdui-condition/condition-node';
import type { ConditionOperatorEvaluator } from '@sdui-condition/condition-operator-evaluator';
import type { PathResolver } from '@sdui-path/path-resolver';
import type { ConditionOp } from '@sdui-model/sdui-enums';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export class FieldConditionNode extends ConditionNode {
  private readonly field: string;
  private readonly operator: ConditionOp;
  private readonly expected: unknown;
  private readonly pathResolver: PathResolver;
  private readonly operatorEvaluator: ConditionOperatorEvaluator;

  constructor(
    field: string,
    operator: ConditionOp,
    expected: unknown,
    pathResolver: PathResolver,
    operatorEvaluator: ConditionOperatorEvaluator,
  ) {
    super();
    this.field = field;
    this.operator = operator;
    this.expected = expected;
    this.pathResolver = pathResolver;
    this.operatorEvaluator = operatorEvaluator;
  }

  public override evaluate(context: ScreenContextModel): boolean {
    const actual = this.pathResolver.resolve(context, this.field);
    return this.operatorEvaluator.apply(this.operator, actual, this.expected);
  }
}

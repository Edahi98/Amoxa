import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support/parse-error-collector';
import { ConditionNode } from '@sdui-condition/condition-node';
import { FieldConditionNode } from '@sdui-condition-nodes/field-condition-node';
import { AllConditionNode } from '@sdui-condition-nodes/all-condition-node';
import { AnyConditionNode } from '@sdui-condition-nodes/any-condition-node';
import { NotConditionNode } from '@sdui-condition-nodes/not-condition-node';
import { PathResolver } from '@sdui-path/path-resolver';
import { ConditionOperatorEvaluator } from '@sdui-condition/condition-operator-evaluator';
import { CONDITION_OPS } from '@sdui-model/sdui-enums';

export class ConditionParser extends AbstractNodeParser<ConditionNode> {
  private readonly pathResolver: PathResolver;
  private readonly operatorEvaluator: ConditionOperatorEvaluator;

  constructor(guard: InputGuard, pathResolver: PathResolver, operatorEvaluator: ConditionOperatorEvaluator) {
    super(guard);
    this.pathResolver = pathResolver;
    this.operatorEvaluator = operatorEvaluator;
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto condition';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): ConditionNode | undefined {
    if ('all' in input) {
      const children = this.parseArray(input['all'], `${path}.all`, errors, this);
      return children === undefined ? undefined : new AllConditionNode(children);
    }

    if ('any' in input) {
      const children = this.parseArray(input['any'], `${path}.any`, errors, this);
      return children === undefined ? undefined : new AnyConditionNode(children);
    }

    if ('not' in input) {
      const child = this.parse(input['not'], `${path}.not`, errors);
      return child === undefined ? undefined : new NotConditionNode(child);
    }

    if ('field' in input) {
      const field = input['field'];
      const op = input['op'];
      if (!this.guard.isNonEmptyString(field) || !this.guard.includesValue(CONDITION_OPS, op)) {
        errors.add(path, 'se esperaba { field, op, value }');
        return undefined;
      }
      return new FieldConditionNode(field, op, input['value'], this.pathResolver, this.operatorEvaluator);
    }

    errors.add(path, 'condition debe tener field/all/any/not');
    return undefined;
  }
}

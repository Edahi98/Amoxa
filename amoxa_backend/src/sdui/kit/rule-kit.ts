import type { RuleSeverity } from '@sdui/sdui-enums.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { RawCondition } from '@sdui-builder/raw-json.types.js';
import { RuleBuilder } from '@sdui-builder/rule-builder.js';

export class RuleKit {
  public static when(
    id: string,
    condition: RawCondition,
    message: string,
    severity: RuleSeverity = 'block',
  ): RuleBuilder {
    return RuleBuilder.of(id).when(condition).message(message).severity(severity);
  }

  public static required(id: string, path: string, message: string, severity: RuleSeverity = 'block'): RuleBuilder {
    return RuleKit.when(id, ConditionBuilder.field(path, 'empty'), message, severity);
  }

  public static anyEmpty(id: string, paths: string[], message: string, severity: RuleSeverity = 'block'): RuleBuilder {
    return RuleKit.when(
      id,
      ConditionBuilder.any(...paths.map((path) => ConditionBuilder.field(path, 'empty'))),
      message,
      severity,
    );
  }

  public static minItems(id: string, path: string, min: number, message: string): RuleBuilder {
    return RuleKit.when(
      id,
      ConditionBuilder.any(ConditionBuilder.field(path, 'empty'), ConditionBuilder.field(`${path}.length`, 'lt', min)),
      message,
    );
  }

  public static flagFalse(id: string, path: string, message: string): RuleBuilder {
    return RuleKit.when(id, ConditionBuilder.field(path, 'ne', true), message);
  }

  public static flagTrue(id: string, path: string, message: string): RuleBuilder {
    return RuleKit.when(id, ConditionBuilder.field(path, 'eq', true), message);
  }

  public static countAbove(id: string, path: string, max: number, message: string): RuleBuilder {
    return RuleKit.when(id, ConditionBuilder.field(path, 'gt', max), message);
  }

  public static stateIsNot(id: string, state: string, message: string): RuleBuilder {
    return RuleKit.when(id, ConditionBuilder.field('entity.estado', 'ne', state), message);
  }

  public static requiredIf(id: string, guard: RawCondition, path: string, message: string): RuleBuilder {
    return RuleKit.when(id, ConditionBuilder.all(guard, ConditionBuilder.field(path, 'empty')), message);
  }
}

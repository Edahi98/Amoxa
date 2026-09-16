import type { ConditionOp } from '@sdui-model/sdui-enums';

export class ConditionOperatorEvaluator {
  public apply(operator: ConditionOp, actual: unknown, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'lt':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'empty':
        return this.isEmpty(actual);
      case 'not_empty':
        return !this.isEmpty(actual);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'contains':
        return this.contains(actual, expected);
      default:
        return false;
    }
  }

  private contains(actual: unknown, expected: unknown): boolean {
    if (Array.isArray(actual)) return actual.includes(expected);
    return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }
}

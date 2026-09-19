import type { ConditionOp } from '@sdui/sdui-enums.js';
import type { RawCondition } from '@sdui-builder/raw-json.types.js';

export class ConditionBuilder {
  public static readonly CONTEXT_ROOTS: readonly string[] = ['user', 'entity', 'data', 'offline', 'clause_refs'];

  public static field(path: string, op: ConditionOp, value?: unknown): RawCondition {
    const field = ConditionBuilder.contextPath(path);
    return value === undefined ? { field, op } : { field, op, value };
  }

  public static contextPath(path: string): string {
    return ConditionBuilder.CONTEXT_ROOTS.includes(path.split('.')[0]) ? path : `data.${path}`;
  }

  public static all(...conditions: RawCondition[]): RawCondition {
    return { all: conditions };
  }

  public static any(...conditions: RawCondition[]): RawCondition {
    return { any: conditions };
  }

  public static not(condition: RawCondition): RawCondition {
    return { not: condition };
  }
}

import type { RuleSeverity } from '@sdui/sdui-enums.js';
import type { RawCondition, RawRule } from '@sdui-builder/raw-json.types.js';

export class RuleBuilder {
  private readonly ruleId: string;
  private condition?: RawCondition;
  private text?: string;
  private level?: RuleSeverity;
  private clause?: string;

  private constructor(id: string) {
    this.ruleId = id;
  }

  public static of(id: string): RuleBuilder {
    return new RuleBuilder(id);
  }

  public when(condition: RawCondition): this {
    this.condition = condition;
    return this;
  }

  public message(text: string): this {
    this.text = text;
    return this;
  }

  public severity(level: RuleSeverity): this {
    this.level = level;
    return this;
  }

  public clauseRef(clause: string): this {
    this.clause = clause;
    return this;
  }

  public build(): RawRule {
    if (this.condition === undefined || this.text === undefined || this.level === undefined) {
      throw new Error(`La regla ${this.ruleId} requiere when, message y severity`);
    }

    const rule: RawRule = { id: this.ruleId, when: this.condition, message: this.text, severity: this.level };
    if (this.clause !== undefined) {
      rule.clause_ref = this.clause;
    }
    return rule;
  }
}

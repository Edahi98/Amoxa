import type { RuleModel } from '@sdui-model/rule.model';
import type { RuleSeverity } from '@sdui-model/sdui-enums';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export class RuleEvaluator {
  private readonly rules: readonly RuleModel[];

  constructor(rules: readonly RuleModel[] | undefined) {
    this.rules = rules ?? [];
  }

  public all(): readonly RuleModel[] {
    return this.rules;
  }

  public find(id: string): RuleModel | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  public violations(context: ScreenContextModel): RuleModel[] {
    return this.rules.filter((rule) => rule.when.evaluate(context));
  }

  public violationsById(ids: readonly string[], context: ScreenContextModel): RuleModel[] {
    return this.rules.filter((rule) => ids.includes(rule.id) && rule.when.evaluate(context));
  }

  public violationsBySeverity(severity: RuleSeverity, context: ScreenContextModel): RuleModel[] {
    return this.violations(context).filter((rule) => rule.severity === severity);
  }

  public blocking(ids: readonly string[], context: ScreenContextModel): RuleModel[] {
    return this.violationsById(ids, context).filter((rule) => rule.severity === 'block');
  }

  public isViolated(id: string, context: ScreenContextModel): boolean {
    return this.violationsById([id], context).length > 0;
  }

  public messages(ids: readonly string[], context: ScreenContextModel): string[] {
    return this.violationsById(ids, context).map((rule) => rule.message);
  }
}

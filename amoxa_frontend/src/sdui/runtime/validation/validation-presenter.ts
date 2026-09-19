import { RuleEvaluator } from '@sdui-rules/rule-evaluator';
import { ComponentTraverser } from '@sdui-traversal/component-traverser';
import { ValueChecks } from '@sdui-runtime-validation/value-checks';
import type { ComponentModel } from '@sdui-model-component/component.model';
import type { RuleModel } from '@sdui-model/rule.model';
import type { ScreenModel } from '@sdui-model-screen/screen.model';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';

export interface RuleSummaryEntry {
  rule: RuleModel;
  targetId?: string;
}

export class ValidationPresenter {
  public static readonly REQUIRED_MESSAGE = 'Este campo es obligatorio.';

  private readonly evaluator: RuleEvaluator;
  private readonly owners = new Map<string, string[]>();

  constructor(screen: ScreenModel, evaluator: RuleEvaluator) {
    this.evaluator = evaluator;
    new ComponentTraverser().walk(screen.root, (component) => {
      (component.validations ?? []).forEach((ruleId) => {
        this.owners.set(ruleId, [...(this.owners.get(ruleId) ?? []), component.id]);
      });
    });
  }

  public errorFor(component: ComponentModel, value: unknown, context: ScreenContextModel): string | undefined {
    const messages = this.evaluator.messages(component.validations ?? [], context);
    if (messages.length > 0) return messages.join(' ');
    if (component.required === true && ValueChecks.isEmpty(value)) return ValidationPresenter.REQUIRED_MESSAGE;
    return undefined;
  }

  public summary(context: ScreenContextModel, isRevealed: (componentId: string) => boolean): RuleSummaryEntry[] {
    return this.evaluator.violations(context).flatMap((rule): RuleSummaryEntry[] => {
      const owners = this.owners.get(rule.id) ?? [];
      if (owners.length === 0) return [{ rule }];
      const target = owners.find((owner) => isRevealed(owner));
      return target === undefined ? [] : [{ rule, targetId: target }];
    });
  }
}

import type { ConditionNode } from '@sdui-condition/condition-node';
import type { RuleSeverity } from '@sdui-model/sdui-enums';

export interface RuleModelInit {
  id: string;
  when: ConditionNode;
  message: string;
  severity: RuleSeverity;
  clauseRef?: string;
}

export class RuleModel {
  public readonly id: string;
  public readonly when: ConditionNode;
  public readonly message: string;
  public readonly severity: RuleSeverity;
  public readonly clauseRef?: string;

  constructor(init: RuleModelInit) {
    this.id = init.id;
    this.when = init.when;
    this.message = init.message;
    this.severity = init.severity;
    this.clauseRef = init.clauseRef;
  }
}

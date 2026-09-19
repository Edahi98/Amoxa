import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support-parse/parse-error-collector';
import { ConditionParser } from '@sdui-parsers/condition-parser';
import { RuleModel } from '@sdui-model/rule.model';
import { RULE_SEVERITIES } from '@sdui-model/sdui-enums';

export class RuleParser extends AbstractNodeParser<RuleModel> {
  private readonly conditionParser: ConditionParser;

  constructor(guard: InputGuard, conditionParser: ConditionParser) {
    super(guard);
    this.conditionParser = conditionParser;
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto rule';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): RuleModel | undefined {
    if (!this.guard.isNonEmptyString(input['id'])) errors.add(`${path}.id`, 'falta id');
    if (!this.guard.isNonEmptyString(input['message'])) errors.add(`${path}.message`, 'falta message');
    if (!this.guard.includesValue(RULE_SEVERITIES, input['severity'])) errors.add(`${path}.severity`, 'severity inválida');

    const when = this.conditionParser.parse(input['when'], `${path}.when`, errors);

    if (
      !this.guard.isNonEmptyString(input['id']) ||
      !this.guard.isNonEmptyString(input['message']) ||
      !this.guard.includesValue(RULE_SEVERITIES, input['severity']) ||
      when === undefined
    ) {
      return undefined;
    }

    return new RuleModel({
      id: input['id'],
      when,
      message: input['message'],
      severity: input['severity'],
      clauseRef: typeof input['clause_ref'] === 'string' ? input['clause_ref'] : undefined,
    });
  }
}

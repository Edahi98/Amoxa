import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support-parse/parse-error-collector';
import { ConditionParser } from '@sdui-parsers/condition-parser';
import { ComponentModel } from '@sdui-model-component/component.model';
import { ComponentEventsModel } from '@sdui-model-component/component-events.model';
import { COMPONENT_TYPES } from '@sdui-model/sdui-enums';

export class ComponentParser extends AbstractNodeParser<ComponentModel> {
  private readonly conditionParser: ConditionParser;

  constructor(guard: InputGuard, conditionParser: ConditionParser) {
    super(guard);
    this.conditionParser = conditionParser;
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto component';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): ComponentModel | undefined {
    const type = input['type'];
    const id = input['id'];

    if (!this.guard.includesValue(COMPONENT_TYPES, type)) {
      errors.add(`${path}.type`, `tipo de componente desconocido: ${String(type)}`);
    }
    if (!this.guard.isNonEmptyString(id)) {
      errors.add(`${path}.id`, 'falta id');
    }
    if (!this.guard.includesValue(COMPONENT_TYPES, type) || !this.guard.isNonEmptyString(id)) {
      return undefined;
    }

    const visibleIf = input['visible_if'] === undefined
      ? undefined
      : this.conditionParser.parse(input['visible_if'], `${path}.visible_if`, errors);

    const enabledIf = input['enabled_if'] === undefined
      ? undefined
      : this.conditionParser.parse(input['enabled_if'], `${path}.enabled_if`, errors);

    const children = input['children'] === undefined
      ? []
      : (this.parseArray(input['children'], `${path}.children`, errors, this) ?? []);

    return new ComponentModel({
      type,
      id,
      props: this.guard.isRecord(input['props']) ? input['props'] : undefined,
      bind: typeof input['bind'] === 'string' ? input['bind'] : undefined,
      visibleIf,
      enabledIf,
      required: typeof input['required'] === 'boolean' ? input['required'] : undefined,
      validations: Array.isArray(input['validations'])
        ? input['validations'].filter((v): v is string => typeof v === 'string')
        : undefined,
      events: this.parseEvents(input['on']),
      children,
      clauseRef: typeof input['clause_ref'] === 'string' ? input['clause_ref'] : undefined,
    });
  }

  private parseEvents(value: unknown): ComponentEventsModel | undefined {
    if (!this.guard.isRecord(value)) return undefined;

    return new ComponentEventsModel({
      press: typeof value['press'] === 'string' ? value['press'] : undefined,
      change: typeof value['change'] === 'string' ? value['change'] : undefined,
      submit: typeof value['submit'] === 'string' ? value['submit'] : undefined,
      longPress: typeof value['long_press'] === 'string' ? value['long_press'] : undefined,
    });
  }
}

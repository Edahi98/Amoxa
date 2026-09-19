import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support-parse/parse-error-collector';
import { ParseResult } from '@sdui-parsing-support-parse/parse-result';
import { ScreenContextParser } from '@sdui-parsers-screen/screen-context-parser';
import { ComponentParser } from '@sdui-parsers/component-parser';
import { ActionMapParser } from '@sdui-parsers-action/action-map-parser';
import { RuleParser } from '@sdui-parsers/rule-parser';
import { StateMachineParser } from '@sdui-parsers-state/state-machine-parser';
import { ScreenModel } from '@sdui-model-screen/screen.model';
import { ScreenMetaModel } from '@sdui-model-screen/screen-meta.model';

export class ScreenParser extends AbstractNodeParser<ScreenModel> {
  private readonly contextParser: ScreenContextParser;
  private readonly componentParser: ComponentParser;
  private readonly actionMapParser: ActionMapParser;
  private readonly ruleParser: RuleParser;
  private readonly stateMachineParser: StateMachineParser;

  constructor(
    guard: InputGuard,
    contextParser: ScreenContextParser,
    componentParser: ComponentParser,
    actionMapParser: ActionMapParser,
    ruleParser: RuleParser,
    stateMachineParser: StateMachineParser,
  ) {
    super(guard);
    this.contextParser = contextParser;
    this.componentParser = componentParser;
    this.actionMapParser = actionMapParser;
    this.ruleParser = ruleParser;
    this.stateMachineParser = stateMachineParser;
  }

  public parseScreen(input: unknown): ParseResult<ScreenModel> {
    const errors = new ParseErrorCollector();
    const screen = this.parse(input, '$', errors);
    if (errors.hasErrors || screen === undefined) {
      return ParseResult.fail(errors.errors);
    }
    return ParseResult.ok(screen);
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto Screen';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): ScreenModel | undefined {
    if (!this.guard.isNonEmptyString(input['version'])) errors.add(`${path}.version`, 'falta version');
    if (!this.guard.isNonEmptyString(input['screen_id'])) errors.add(`${path}.screen_id`, 'falta screen_id');
    if (!this.guard.isNonEmptyString(input['title'])) errors.add(`${path}.title`, 'falta title');

    const context = this.contextParser.parse(input['context'], `${path}.context`, errors);
    const root = this.componentParser.parse(input['root'], `${path}.root`, errors);
    const actions = this.actionMapParser.parse(input['actions'], `${path}.actions`, errors);
    const rules = input['rules'] === undefined
      ? undefined
      : this.parseArray(input['rules'], `${path}.rules`, errors, this.ruleParser);
    const stateMachine = input['state_machine'] === undefined
      ? undefined
      : this.stateMachineParser.parse(input['state_machine'], `${path}.state_machine`, errors);

    if (
      context === undefined ||
      root === undefined ||
      actions === undefined ||
      !this.guard.isNonEmptyString(input['version']) ||
      !this.guard.isNonEmptyString(input['screen_id']) ||
      !this.guard.isNonEmptyString(input['title'])
    ) {
      return undefined;
    }

    return new ScreenModel({
      version: input['version'],
      screenId: input['screen_id'],
      title: input['title'],
      subtitle: typeof input['subtitle'] === 'string' ? input['subtitle'] : undefined,
      context,
      root,
      actions,
      rules,
      stateMachine,
      meta: this.parseMeta(input['meta']),
    });
  }

  private parseMeta(value: unknown): ScreenMetaModel | undefined {
    if (!this.guard.isRecord(value)) return undefined;

    return new ScreenMetaModel({
      generatedAt: typeof value['generated_at'] === 'string' ? value['generated_at'] : undefined,
      etag: typeof value['etag'] === 'string' ? value['etag'] : undefined,
      traceId: typeof value['trace_id'] === 'string' ? value['trace_id'] : undefined,
    });
  }
}

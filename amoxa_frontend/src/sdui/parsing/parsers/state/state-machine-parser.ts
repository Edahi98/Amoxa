import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support-parse/parse-error-collector';
import { StateTransitionParser } from '@sdui-parsers-state/state-transition-parser';
import { StateMachineModel } from '@sdui-model-state/state-machine.model';

export class StateMachineParser extends AbstractNodeParser<StateMachineModel> {
  private readonly transitionParser: StateTransitionParser;

  constructor(guard: InputGuard, transitionParser: StateTransitionParser) {
    super(guard);
    this.transitionParser = transitionParser;
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto state_machine';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): StateMachineModel | undefined {
    const transitions = input['transitions'] === undefined
      ? undefined
      : this.parseArray(input['transitions'], `${path}.transitions`, errors, this.transitionParser);

    return new StateMachineModel({
      current: typeof input['current'] === 'string' ? input['current'] : undefined,
      transitions,
    });
  }
}

import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support/parse-error-collector';
import { StateTransitionModel } from '@sdui-model-state/state-transition.model';

export class StateTransitionParser extends AbstractNodeParser<StateTransitionModel> {
  constructor(guard: InputGuard) {
    super(guard);
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto de transición';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): StateTransitionModel | undefined {
    if (!this.guard.isNonEmptyString(input['to']) || !this.guard.isNonEmptyString(input['action'])) {
      errors.add(path, 'se esperaba { to, action }');
      return undefined;
    }

    return new StateTransitionModel({
      to: input['to'],
      action: input['action'],
      roles: Array.isArray(input['roles']) ? input['roles'].filter((v): v is string => typeof v === 'string') : undefined,
      requires: Array.isArray(input['requires']) ? input['requires'].filter((v): v is string => typeof v === 'string') : undefined,
    });
  }
}

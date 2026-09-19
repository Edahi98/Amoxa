import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support-parse/parse-error-collector';
import { ActionParser } from '@sdui-parsers-action/action-parser';
import { ActionModel } from '@sdui-model/action.model';

export class ActionMapParser extends AbstractNodeParser<Record<string, ActionModel>> {
  private readonly actionParser: ActionParser;

  constructor(guard: InputGuard, actionParser: ActionParser) {
    super(guard);
    this.actionParser = actionParser;
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto de acciones';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): Record<string, ActionModel> | undefined {
    const result: Record<string, ActionModel> = {};
    let hasError = false;

    for (const [key, value] of Object.entries(input)) {
      const action = this.actionParser.parse(value, `${path}.${key}`, errors);
      if (action === undefined) {
        hasError = true;
        continue;
      }
      result[key] = action;
    }

    return hasError ? undefined : result;
  }
}

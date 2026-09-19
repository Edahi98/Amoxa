import { InputGuard } from '@sdui-parsing-support/input-guard';
import { PathTokenizer } from '@sdui-path/path-tokenizer';
import { PathResolver } from '@sdui-path/path-resolver';
import { ConditionOperatorEvaluator } from '@sdui-condition/condition-operator-evaluator';
import { ConditionParser } from '@sdui-parsers/condition-parser';
import { ComponentParser } from '@sdui-parsers/component-parser';
import { ActionParser } from '@sdui-parsers-action/action-parser';
import { ActionMapParser } from '@sdui-parsers-action/action-map-parser';
import { RuleParser } from '@sdui-parsers/rule-parser';
import { StateTransitionParser } from '@sdui-parsers-state/state-transition-parser';
import { StateMachineParser } from '@sdui-parsers-state/state-machine-parser';
import { ScreenContextParser } from '@sdui-parsers-screen/screen-context-parser';
import { ScreenParser } from '@sdui-parsers-screen/screen-parser';

export class ScreenParserFactory {
  public static create(): ScreenParser {
    const guard = new InputGuard();
    const pathResolver = new PathResolver(new PathTokenizer());
    const conditionParser = new ConditionParser(guard, pathResolver, new ConditionOperatorEvaluator());
    const componentParser = new ComponentParser(guard, conditionParser);
    const actionMapParser = new ActionMapParser(guard, new ActionParser(guard));
    const ruleParser = new RuleParser(guard, conditionParser);
    const stateMachineParser = new StateMachineParser(guard, new StateTransitionParser(guard));
    const contextParser = new ScreenContextParser(guard);

    return new ScreenParser(guard, contextParser, componentParser, actionMapParser, ruleParser, stateMachineParser);
  }
}

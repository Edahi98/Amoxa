import type { StateTransitionModel } from '@sdui-model-state/state-transition.model';

export interface StateMachineModelInit {
  current?: string;
  transitions?: readonly StateTransitionModel[];
}

export class StateMachineModel {
  public readonly current?: string;
  public readonly transitions?: readonly StateTransitionModel[];

  constructor(init: StateMachineModelInit) {
    this.current = init.current;
    this.transitions = init.transitions;
  }
}

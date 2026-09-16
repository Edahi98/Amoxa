export interface StateTransitionModelInit {
  to: string;
  action: string;
  roles?: readonly string[];
  requires?: readonly string[];
}

export class StateTransitionModel {
  public readonly to: string;
  public readonly action: string;
  public readonly roles?: readonly string[];
  public readonly requires?: readonly string[];

  constructor(init: StateTransitionModelInit) {
    this.to = init.to;
    this.action = init.action;
    this.roles = init.roles;
    this.requires = init.requires;
  }
}

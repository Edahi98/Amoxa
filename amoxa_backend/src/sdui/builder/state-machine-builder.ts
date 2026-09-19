import type { RawStateMachine, RawTransition } from '@sdui-builder/raw-json.types.js';

export class StateMachineBuilder {
  private currentState?: string;
  private readonly transitions: RawTransition[] = [];

  private constructor() {}

  public static create(): StateMachineBuilder {
    return new StateMachineBuilder();
  }

  public current(state: string): this {
    this.currentState = state;
    return this;
  }

  public transition(to: string, action: string, options?: { roles?: string[]; requires?: string[] }): this {
    this.transitions.push({ to, action, ...options });
    return this;
  }

  public build(): RawStateMachine {
    const machine: RawStateMachine = { transitions: this.transitions.map((transition) => ({ ...transition })) };
    if (this.currentState !== undefined) {
      machine.current = this.currentState;
    }
    return machine;
  }
}

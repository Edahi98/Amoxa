import type { RawAction, RawMeta, RawRule, RawScreen, RawStateMachine } from '@sdui-builder/raw-json.types.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { RuleBuilder } from '@sdui-builder/rule-builder.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';

export class ScreenBuilder {
  private readonly screenId: string;
  private readonly title: string;
  private readonly version: string;
  private screenSubtitle?: string;
  private contextBuilder?: ScreenContextBuilder;
  private rootBuilder?: ComponentBuilder;
  private readonly actions: Record<string, RawAction> = {};
  private readonly rules: RawRule[] = [];
  private machine?: RawStateMachine;
  private screenMeta?: RawMeta;

  private constructor(screenId: string, title: string, version: string) {
    this.screenId = screenId;
    this.title = title;
    this.version = version;
  }

  public static of(screenId: string, title: string, version = '1.0'): ScreenBuilder {
    return new ScreenBuilder(screenId, title, version);
  }

  public subtitle(subtitle: string): this {
    this.screenSubtitle = subtitle;
    return this;
  }

  public context(context: ScreenContextBuilder): this {
    this.contextBuilder = context;
    return this;
  }

  public root(root: ComponentBuilder): this {
    this.rootBuilder = root;
    return this;
  }

  public action(id: string, action: ActionBuilder): this {
    this.actions[id] = action.build();
    return this;
  }

  public rule(rule: RuleBuilder): this {
    this.rules.push(rule.build());
    return this;
  }

  public stateMachine(machine: StateMachineBuilder): this {
    this.machine = machine.build();
    return this;
  }

  public meta(meta: RawMeta): this {
    this.screenMeta = meta;
    return this;
  }

  public build(): RawScreen {
    if (this.contextBuilder === undefined || this.rootBuilder === undefined) {
      throw new Error(`La pantalla ${this.screenId} requiere context y root`);
    }

    const screen: RawScreen = {
      version: this.version,
      screen_id: this.screenId,
      title: this.title,
      context: this.contextBuilder.build(),
      root: this.rootBuilder.build(),
      actions: { ...this.actions },
    };
    if (this.screenSubtitle !== undefined) screen.subtitle = this.screenSubtitle;
    if (this.rules.length > 0) screen.rules = this.rules.map((rule) => ({ ...rule }));
    if (this.machine !== undefined) screen.state_machine = this.machine;
    if (this.screenMeta !== undefined) screen.meta = this.screenMeta;
    return screen;
  }
}

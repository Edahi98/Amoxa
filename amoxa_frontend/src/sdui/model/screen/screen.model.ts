import type { ComponentModel } from '@sdui-model-component/component.model';
import type { ActionModel } from '@sdui-model/action.model';
import type { RuleModel } from '@sdui-model/rule.model';
import type { StateMachineModel } from '@sdui-model-state/state-machine.model';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import type { ScreenMetaModel } from '@sdui-model-screen/screen-meta.model';

export interface ScreenModelInit {
  version: string;
  screenId: string;
  title: string;
  subtitle?: string;
  context: ScreenContextModel;
  root: ComponentModel;
  actions: Readonly<Record<string, ActionModel>>;
  rules?: readonly RuleModel[];
  stateMachine?: StateMachineModel;
  meta?: ScreenMetaModel;
}

export class ScreenModel {
  public readonly version: string;
  public readonly screenId: string;
  public readonly title: string;
  public readonly subtitle?: string;
  public readonly context: ScreenContextModel;
  public readonly root: ComponentModel;
  public readonly actions: Readonly<Record<string, ActionModel>>;
  public readonly rules?: readonly RuleModel[];
  public readonly stateMachine?: StateMachineModel;
  public readonly meta?: ScreenMetaModel;

  constructor(init: ScreenModelInit) {
    this.version = init.version;
    this.screenId = init.screenId;
    this.title = init.title;
    this.subtitle = init.subtitle;
    this.context = init.context;
    this.root = init.root;
    this.actions = init.actions;
    this.rules = init.rules;
    this.stateMachine = init.stateMachine;
    this.meta = init.meta;
  }
}

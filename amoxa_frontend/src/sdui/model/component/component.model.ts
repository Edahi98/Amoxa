import type { ConditionNode } from '@sdui-condition/condition-node';
import type { ComponentType } from '@sdui-model/sdui-enums';
import type { ComponentEventsModel } from '@sdui-model-component/component-events.model';

export interface ComponentModelInit {
  type: ComponentType;
  id: string;
  props?: Record<string, unknown>;
  bind?: string;
  visibleIf?: ConditionNode;
  enabledIf?: ConditionNode;
  required?: boolean;
  validations?: readonly string[];
  events?: ComponentEventsModel;
  children?: readonly ComponentModel[];
  clauseRef?: string;
}

export class ComponentModel {
  public readonly type: ComponentType;
  public readonly id: string;
  public readonly props?: Record<string, unknown>;
  public readonly bind?: string;
  public readonly visibleIf?: ConditionNode;
  public readonly enabledIf?: ConditionNode;
  public readonly required?: boolean;
  public readonly validations?: readonly string[];
  public readonly events?: ComponentEventsModel;
  public readonly children: readonly ComponentModel[];
  public readonly clauseRef?: string;

  constructor(init: ComponentModelInit) {
    this.type = init.type;
    this.id = init.id;
    this.props = init.props;
    this.bind = init.bind;
    this.visibleIf = init.visibleIf;
    this.enabledIf = init.enabledIf;
    this.required = init.required;
    this.validations = init.validations;
    this.events = init.events;
    this.children = init.children ?? [];
    this.clauseRef = init.clauseRef;
  }
}

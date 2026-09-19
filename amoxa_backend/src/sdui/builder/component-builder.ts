import type { ComponentType } from '@sdui/sdui-enums.js';
import type { RawComponent, RawCondition, RawEventName } from '@sdui-builder/raw-json.types.js';

export class ComponentBuilder {
  private readonly node: RawComponent;
  private readonly childBuilders: ComponentBuilder[] = [];

  private constructor(type: ComponentType, id: string) {
    this.node = { type, id };
  }

  public static of(type: ComponentType, id: string): ComponentBuilder {
    return new ComponentBuilder(type, id);
  }

  public props(props: Record<string, unknown>): this {
    this.node.props = { ...this.node.props, ...props };
    return this;
  }

  public bind(path: string): this {
    this.node.bind = path;
    return this;
  }

  public required(value = true): this {
    this.node.required = value;
    return this;
  }

  public validations(...ruleIds: string[]): this {
    this.node.validations = ruleIds;
    return this;
  }

  public visibleIf(condition: RawCondition): this {
    this.node.visible_if = condition;
    return this;
  }

  public enabledIf(condition: RawCondition): this {
    this.node.enabled_if = condition;
    return this;
  }

  public clauseRef(clause: string): this {
    this.node.clause_ref = clause;
    return this;
  }

  public on(event: RawEventName, actionId: string): this {
    this.node.on = { ...this.node.on, [event]: actionId };
    return this;
  }

  public child(builder: ComponentBuilder): this {
    this.childBuilders.push(builder);
    return this;
  }

  public children(...builders: ComponentBuilder[]): this {
    this.childBuilders.push(...builders);
    return this;
  }

  public build(): RawComponent {
    if (this.childBuilders.length === 0) {
      return { ...this.node };
    }
    return { ...this.node, children: this.childBuilders.map((builder) => builder.build()) };
  }
}

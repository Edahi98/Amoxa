import type { ActionMethod, ActionType } from '@sdui/sdui-enums.js';
import type { RawAction } from '@sdui-builder/raw-json.types.js';

export class ActionBuilder {
  private readonly node: RawAction;

  private constructor(type: ActionType) {
    this.node = { type };
  }

  public static of(type: ActionType): ActionBuilder {
    return new ActionBuilder(type);
  }

  public screen(screenId: string, params?: Record<string, unknown>): this {
    this.node.screen_id = screenId;
    if (params !== undefined) {
      this.node.params = params;
    }
    return this;
  }

  public request(method: ActionMethod, endpoint: string): this {
    this.node.method = method;
    this.node.endpoint = endpoint;
    return this;
  }

  public payload(payload: Record<string, unknown>): this {
    this.node.payload = payload;
    return this;
  }

  public idempotencyKey(key: string): this {
    this.node.idempotency_key = key;
    return this;
  }

  public ifVersion(version: number): this {
    this.node.if_version = version;
    return this;
  }

  public optimistic(value = true): this {
    this.node.optimistic = value;
    return this;
  }

  public requiresRules(...ruleIds: string[]): this {
    this.node.requires_rules = ruleIds;
    return this;
  }

  public onSuccess(actionId: string): this {
    this.node.on_success = actionId;
    return this;
  }

  public onError(actionId: string): this {
    this.node.on_error = actionId;
    return this;
  }

  public confirmText(text: string): this {
    this.node.confirm_text = text;
    return this;
  }

  public build(): RawAction {
    return { ...this.node };
  }
}

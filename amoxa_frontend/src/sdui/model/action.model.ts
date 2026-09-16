import type { ActionMethod, ActionType } from '@sdui-model/sdui-enums';

export interface ActionModelInit {
  type: ActionType;
  screenId?: string;
  params?: Record<string, unknown>;
  method?: ActionMethod;
  endpoint?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  ifVersion?: number;
  optimistic?: boolean;
  requiresRules?: readonly string[];
  onSuccess?: string;
  onError?: string;
  confirmText?: string;
}

export class ActionModel {
  public readonly type: ActionType;
  public readonly screenId?: string;
  public readonly params?: Record<string, unknown>;
  public readonly method?: ActionMethod;
  public readonly endpoint?: string;
  public readonly payload?: Record<string, unknown>;
  public readonly idempotencyKey?: string;
  public readonly ifVersion?: number;
  public readonly optimistic?: boolean;
  public readonly requiresRules?: readonly string[];
  public readonly onSuccess?: string;
  public readonly onError?: string;
  public readonly confirmText?: string;

  constructor(init: ActionModelInit) {
    this.type = init.type;
    this.screenId = init.screenId;
    this.params = init.params;
    this.method = init.method;
    this.endpoint = init.endpoint;
    this.payload = init.payload;
    this.idempotencyKey = init.idempotencyKey;
    this.ifVersion = init.ifVersion;
    this.optimistic = init.optimistic;
    this.requiresRules = init.requiresRules;
    this.onSuccess = init.onSuccess;
    this.onError = init.onError;
    this.confirmText = init.confirmText;
  }
}

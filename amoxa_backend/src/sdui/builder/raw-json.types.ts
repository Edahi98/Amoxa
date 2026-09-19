import type {
  ActionMethod,
  ActionType,
  ComponentType,
  ConditionOp,
  ConflictPolicy,
  RuleSeverity,
} from '@sdui/sdui-enums.js';
import type { SessionRole } from '@shared/roles.js';

export type RawCondition =
  | { field: string; op: ConditionOp; value?: unknown }
  | { all: RawCondition[] }
  | { any: RawCondition[] }
  | { not: RawCondition };

export type RawEventName = 'press' | 'change' | 'submit' | 'long_press';

export type RawEvents = Partial<Record<RawEventName, string>>;

export interface RawComponent {
  type: ComponentType;
  id: string;
  props?: Record<string, unknown>;
  bind?: string;
  visible_if?: RawCondition;
  enabled_if?: RawCondition;
  required?: boolean;
  validations?: string[];
  on?: RawEvents;
  children?: RawComponent[];
  clause_ref?: string;
}

export interface RawAction {
  type: ActionType;
  screen_id?: string;
  params?: Record<string, unknown>;
  method?: ActionMethod;
  endpoint?: string;
  payload?: Record<string, unknown>;
  idempotency_key?: string;
  if_version?: number;
  optimistic?: boolean;
  requires_rules?: string[];
  on_success?: string;
  on_error?: string;
  confirm_text?: string;
}

export interface RawRule {
  id: string;
  when: RawCondition;
  message: string;
  severity: RuleSeverity;
  clause_ref?: string;
}

export interface RawTransition {
  to: string;
  action: string;
  roles?: string[];
  requires?: string[];
}

export interface RawStateMachine {
  current?: string;
  transitions?: RawTransition[];
}

export interface RawUser {
  id: string;
  nombre?: string;
  rol: SessionRole;
  proceso_id?: string | null;
}

export interface RawEntity {
  type: string;
  id: string;
  version: number;
  estado?: string;
}

export interface RawOffline {
  enabled?: boolean;
  cache_ttl_seconds?: number;
  conflict_policy?: ConflictPolicy;
}

export interface RawContext {
  user: RawUser;
  entity?: RawEntity;
  clause_refs?: string[];
  offline?: RawOffline;
  data?: Record<string, unknown>;
}

export interface RawMeta {
  generated_at?: string;
  etag?: string;
  trace_id?: string;
}

export interface RawScreen {
  version: string;
  screen_id: string;
  title: string;
  subtitle?: string;
  context: RawContext;
  root: RawComponent;
  actions: Record<string, RawAction>;
  rules?: RawRule[];
  state_machine?: RawStateMachine;
  meta?: RawMeta;
}

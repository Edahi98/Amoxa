export const COMPONENT_TYPES = [
  'container', 'section', 'card', 'list', 'tabs', 'divider',
  'text', 'badge', 'kpi', 'progress', 'clause_tag', 'chart',
  'text_input', 'textarea', 'number_input', 'date_input', 'select', 'multiselect', 'toggle', 'radio_group',
  'checklist_item', 'evidence_capture', 'signature', 'geo_stamp',
  'person_picker', 'process_picker', 'clause_picker',
  'finding_card', 'action_card', 'audit_card', 'program_calendar', 'gantt',
  'button', 'banner', 'empty_state', 'sync_status', 'table',
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const CONDITION_OPS = ['eq', 'ne', 'in', 'not_in', 'gt', 'lt', 'empty', 'not_empty', 'contains'] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export const RULE_SEVERITIES = ['block', 'warn', 'info'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

export const ACTION_TYPES = [
  'navigate', 'submit', 'refresh', 'open_modal', 'close', 'sync_now',
  'capture_media', 'call_api', 'confirm', 'toast', 'logout',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_METHODS = ['GET', 'POST', 'PUT', 'PATCH'] as const;
export type ActionMethod = (typeof ACTION_METHODS)[number];

export const CONFLICT_POLICIES = ['last_write_wins', 'server_wins', 'manual'] as const;
export type ConflictPolicy = (typeof CONFLICT_POLICIES)[number];

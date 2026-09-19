import type { StateMachineModel } from '@sdui-model-state/state-machine.model';
import type { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import type { RuleEvaluator } from '@sdui-rules/rule-evaluator';

export type GuardDenial = 'role' | 'requires';

export interface GuardDecision {
  allowed: boolean;
  denial?: GuardDenial;
  message?: string;
}

export class StateMachineGuard {
  private readonly machine: StateMachineModel | undefined;
  private readonly rules: RuleEvaluator;

  constructor(machine: StateMachineModel | undefined, rules: RuleEvaluator) {
    this.machine = machine;
    this.rules = rules;
  }

  public check(actionId: string, context: ScreenContextModel): GuardDecision {
    const candidates = (this.machine?.transitions ?? []).filter((transition) => transition.action === actionId);
    if (candidates.length === 0) return { allowed: true };

    const permitted = candidates.filter((transition) => {
      const roles = transition.roles;
      return roles === undefined || roles.length === 0 || context.user.rol === 'superusuario' || roles.includes(context.user.rol);
    });
    if (permitted.length === 0) {
      return { allowed: false, denial: 'role', message: 'Esta acción no está disponible para su rol.' };
    }

    const open = permitted.find((transition) => this.rules.violationsById(transition.requires ?? [], context).length === 0);
    if (open) return { allowed: true };

    const pending = this.rules.violationsById(permitted[0].requires ?? [], context);
    return {
      allowed: false,
      denial: 'requires',
      message: pending[0]?.message ?? 'Todavía no se cumplen las condiciones para esta acción.',
    };
  }

  public isAllowed(actionId: string, context: ScreenContextModel): boolean {
    return this.check(actionId, context).allowed;
  }
}

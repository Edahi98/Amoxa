import type { Permission } from '@shared/roles.js';

export interface DeclaredAction {
  id: string;
  permission: Permission;
  method: string;
}

export class ActionRegistry {
  private static readonly declared = new Map<object, DeclaredAction[]>();

  public static declare(owner: object, action: DeclaredAction): void {
    const current = ActionRegistry.declared.get(owner) ?? [];
    ActionRegistry.declared.set(owner, [...current, action]);
  }

  public static of(owner: object): readonly DeclaredAction[] {
    const parent: unknown = Object.getPrototypeOf(owner);
    const inherited = typeof parent === 'function' ? ActionRegistry.of(parent) : [];
    return [...inherited, ...(ActionRegistry.declared.get(owner) ?? [])];
  }
}

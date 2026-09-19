import { ROLES, type SessionRole } from '@shared/roles.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { RawComponent, RawCondition, RawScreen } from '@sdui-builder/raw-json.types.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import '@screens/index.js';

class ConditionFields {
  public static of(condition: RawCondition | undefined): string[] {
    if (condition === undefined) return [];
    if ('all' in condition) return condition.all.flatMap((child) => ConditionFields.of(child));
    if ('any' in condition) return condition.any.flatMap((child) => ConditionFields.of(child));
    if ('not' in condition) return ConditionFields.of(condition.not);
    return [condition.field];
  }

  public static inScreen(screen: RawScreen): string[] {
    const fromRules = (screen.rules ?? []).flatMap((rule) => ConditionFields.of(rule.when));
    return [...fromRules, ...ConditionFields.inComponent(screen.root)];
  }

  private static inComponent(component: RawComponent): string[] {
    return [
      ...ConditionFields.of(component.visible_if),
      ...ConditionFields.of(component.enabled_if),
      ...(component.children ?? []).flatMap((child) => ConditionFields.inComponent(child)),
    ];
  }
}

const ROLES_TO_CHECK = (Object.keys(ROLES) as SessionRole[]).filter((role) => (role as string) !== 'sistema');
const CASES = ROLES_TO_CHECK.flatMap((role) => ROLES[role].screens.map((screenId) => ({ role, screenId })));

describe('rutas de condiciones y reglas', () => {
  it('las condiciones se resuelven desde la raíz del contexto, no desde los datos', () => {
    expect(ConditionBuilder.field('programa.periodo', 'empty')).toEqual({ field: 'data.programa.periodo', op: 'empty' });
    expect(ConditionBuilder.field('entity.id', 'empty')).toEqual({ field: 'entity.id', op: 'empty' });
    expect(ConditionBuilder.field('user.rol', 'eq', 'gestor')).toEqual({ field: 'user.rol', op: 'eq', value: 'gestor' });
    expect(ConditionBuilder.field('data.avance', 'lt', 50)).toEqual({ field: 'data.avance', op: 'lt', value: 50 });
  });

  it.each(CASES)('$screenId ($role) solo usa rutas que empiezan por una raíz del contexto', ({ role, screenId }) => {
    const screen = ScreenFactory.createById(screenId, ScreenContextBuilder.forUser({ id: 'u1', rol: role }));

    for (const field of ConditionFields.inScreen(screen)) {
      expect(ConditionBuilder.CONTEXT_ROOTS, `${screenId}: ${field}`).toContain(field.split('.')[0]);
    }
  });
});

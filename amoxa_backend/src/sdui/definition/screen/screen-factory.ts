import type { RoleKey } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { RawScreen } from '@sdui-builder/raw-json.types.js';
import { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ActionRegistry } from '@sdui-registry/action-registry.js';
import { RawScreenPruner } from '@sdui-definition/raw-screen-pruner.js';
import type { ScreenDefinitionConstructor } from '@sdui-definition-screen/screen-definition.js';
import { ScreenRegistry } from '@sdui-registry/screen-registry.js';

export class ScreenFactory {
  public static create(definitionClass: ScreenDefinitionConstructor, context: ScreenContextBuilder): RawScreen {
    const meta = ScreenRegistry.metaOf(definitionClass);
    const role = context.role;
    RoleAccess.assertCanSee(role, meta.screenId);

    const definition = new definitionClass();
    const builder = ScreenBuilder.of(meta.screenId, meta.title, meta.version).context(context);
    if (meta.subtitle !== undefined) {
      builder.subtitle(meta.subtitle);
    }
    definition.prepare(context, role);
    definition.define(builder, role);

    const denied = new Set<string>();
    for (const declared of ActionRegistry.of(definitionClass)) {
      if (!RoleAccess.can(role, declared.permission)) {
        denied.add(declared.id);
        continue;
      }
      builder.action(declared.id, ScreenFactory.invoke(definition, declared.method));
    }

    const raw = builder.build();
    for (const [id, action] of Object.entries(raw.actions)) {
      if (action.type === 'navigate' && !ScreenFactory.canNavigate(role, action.screen_id)) {
        denied.add(id);
      }
    }

    const pruned = RawScreenPruner.prune(raw, denied);
    const estado = context.build().entity?.estado;
    if (pruned.state_machine !== undefined && estado !== undefined) {
      pruned.state_machine = { ...pruned.state_machine, current: estado };
    }
    return pruned;
  }

  public static createById(screenId: string, context: ScreenContextBuilder): RawScreen {
    const definitionClass = ScreenRegistry.findByScreenId(screenId);
    if (definitionClass === undefined) {
      throw new Error(`No hay definición registrada para la pantalla ${screenId}`);
    }
    return ScreenFactory.create(definitionClass, context);
  }

  private static canNavigate(role: RoleKey, screenId: string | undefined): boolean {
    return screenId !== undefined && RoleAccess.canSee(role, screenId);
  }

  private static invoke(definition: object, method: string): ActionBuilder {
    const factory: unknown = Reflect.get(definition, method);
    if (typeof factory !== 'function') {
      throw new Error(`${method} no es un método`);
    }
    const result: unknown = factory.call(definition);
    if (!(result instanceof ActionBuilder)) {
      throw new Error(`${method} debe devolver un ActionBuilder`);
    }
    return result;
  }
}

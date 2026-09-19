import type { Permission } from '@shared/roles.js';
import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ActionRegistry } from '@sdui-registry/action-registry.js';

export interface ActionOptions {
  id: string;
  permission: Permission;
}

export class ActionDecorator {
  public static of(options: ActionOptions) {
    return (
      target: object,
      propertyKey: string | symbol,
      _descriptor: TypedPropertyDescriptor<() => ActionBuilder>,
    ): void => {
      ActionRegistry.declare(target.constructor, {
        id: options.id,
        permission: options.permission,
        method: String(propertyKey),
      });
    };
  }
}

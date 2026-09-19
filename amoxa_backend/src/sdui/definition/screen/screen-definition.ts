import type { RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';

export abstract class ScreenDefinition {
  public abstract define(builder: ScreenBuilder, role: RoleKey): void;

  public prepare(_context: ScreenContextBuilder, _role: RoleKey): void {}
}

export type ScreenDefinitionConstructor = new () => ScreenDefinition;

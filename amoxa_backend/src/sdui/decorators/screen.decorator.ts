import type { ScreenDefinitionConstructor } from '@sdui-definition-screen/screen-definition.js';
import { ScreenRegistry, type ScreenMeta } from '@sdui-registry/screen-registry.js';

export class ScreenDecorator {
  public static of(meta: ScreenMeta) {
    return (target: ScreenDefinitionConstructor): void => {
      ScreenRegistry.register(target, meta);
    };
  }
}

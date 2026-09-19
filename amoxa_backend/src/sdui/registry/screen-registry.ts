import type { ScreenId } from '@shared/roles.js';
import type { ScreenDefinitionConstructor } from '@sdui-definition-screen/screen-definition.js';

export interface ScreenMeta {
  screenId: ScreenId;
  title: string;
  version?: string;
  subtitle?: string;
}

export class ScreenRegistry {
  private static readonly entries = new Map<ScreenDefinitionConstructor, ScreenMeta>();

  public static register(target: ScreenDefinitionConstructor, meta: ScreenMeta): void {
    ScreenRegistry.entries.set(target, meta);
  }

  public static metaOf(target: ScreenDefinitionConstructor): ScreenMeta {
    const meta = ScreenRegistry.entries.get(target);
    if (meta === undefined) {
      throw new Error(`${target.name} no está registrada con @Screen`);
    }
    return meta;
  }

  public static screenIds(): string[] {
    return [...ScreenRegistry.entries.values()].map((meta) => meta.screenId);
  }

  public static titleOf(screenId: string): string {
    const target = ScreenRegistry.findByScreenId(screenId);
    return target === undefined ? screenId : ScreenRegistry.metaOf(target).title;
  }

  public static findByScreenId(screenId: string): ScreenDefinitionConstructor | undefined {
    for (const [target, meta] of ScreenRegistry.entries) {
      if (meta.screenId === screenId) return target;
    }
    return undefined;
  }
}

import type { ScreenDataProviderConstructor } from '@sdui-data/screen-data-provider.js';

export class ScreenDataRegistry {
  private static readonly entries = new Map<string, ScreenDataProviderConstructor>();

  public static register(screenIds: readonly string[], provider: ScreenDataProviderConstructor): void {
    for (const screenId of screenIds) {
      ScreenDataRegistry.entries.set(screenId, provider);
    }
  }

  public static providerFor(screenId: string): ScreenDataProviderConstructor | undefined {
    return ScreenDataRegistry.entries.get(screenId);
  }

  public static screenIds(): readonly string[] {
    return [...ScreenDataRegistry.entries.keys()];
  }
}

import type { OptionSpec } from '@sdui-kit/kit-types.js';

export class ScreenDataReader {
  public static get(data: Record<string, unknown> | undefined, path: string): unknown {
    let current: unknown = data;
    for (const segment of path.split('.')) {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  public static records(data: Record<string, unknown> | undefined, path: string): Record<string, unknown>[] {
    const value = ScreenDataReader.get(data, path);
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [];
  }

  public static options(data: Record<string, unknown> | undefined, path: string): OptionSpec[] {
    return ScreenDataReader.records(data, path).flatMap((item) => {
      if (typeof item['value'] !== 'string' || typeof item['label'] !== 'string') {
        return [];
      }
      const option: OptionSpec = { value: item['value'], label: item['label'] };
      if (typeof item['description'] === 'string') {
        option.description = item['description'];
      }
      if (item['disabled'] === true) {
        option.disabled = true;
        if (typeof item['disabledReason'] === 'string') {
          option.disabledReason = item['disabledReason'];
        }
      }
      return [option];
    });
  }

  public static text(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }
}

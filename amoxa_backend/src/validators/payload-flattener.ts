export class PayloadFlattener {
  public static merge(key: string): (value: unknown) => unknown {
    return (value: unknown): unknown => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return value;
      }
      const source = value as Record<string, unknown>;
      const nested = source[key];
      if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) {
        return source;
      }
      return { ...source, ...(nested as Record<string, unknown>) };
    };
  }
}

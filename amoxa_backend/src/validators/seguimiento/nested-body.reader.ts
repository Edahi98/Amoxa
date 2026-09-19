export class NestedBodyReader {
  public static pick(value: unknown, group: string, keys: readonly string[]): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    const root = value as Record<string, unknown>;
    const nested = NestedBodyReader.asRecord(root[group]);
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const candidate = root[key] !== undefined ? root[key] : nested[key];
      if (candidate !== undefined) {
        result[key] = candidate;
      }
    }
    return result;
  }

  private static asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}

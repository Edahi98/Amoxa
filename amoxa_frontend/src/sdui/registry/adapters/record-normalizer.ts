export class RecordNormalizer {
  public static camel(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => RecordNormalizer.camel(item));
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [RecordNormalizer.camelKey(key), RecordNormalizer.camel(entry)]),
      );
    }
    return value;
  }

  public static record(value: unknown): Record<string, unknown> {
    const normalized = RecordNormalizer.camel(value);
    return typeof normalized === 'object' && normalized !== null && !Array.isArray(normalized)
      ? (normalized as Record<string, unknown>)
      : {};
  }

  private static camelKey(key: string): string {
    return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
  }
}

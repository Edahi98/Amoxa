export class NestedPayload {
  public static unwrap(key: string): (value: unknown) => unknown {
    return (value: unknown): unknown => {
      if (NestedPayload.isRecord(value) && NestedPayload.isRecord(value[key])) {
        return value[key];
      }
      return value ?? {};
    };
  }

  public static blank(value: unknown): unknown {
    return value === '' || value === null ? undefined : value;
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

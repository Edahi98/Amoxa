
export class InputGuard {
  public isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  public isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  public includesValue<TValue extends string>(list: readonly TValue[], value: unknown): value is TValue {
    return typeof value === 'string' && (list as readonly string[]).includes(value);
  }
}

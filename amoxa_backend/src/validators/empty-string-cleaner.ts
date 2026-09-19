export class EmptyStringCleaner {
  public static toUndefined(value: unknown): unknown {
    return value === '' ? undefined : value;
  }
}

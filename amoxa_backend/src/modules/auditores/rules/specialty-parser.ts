export class SpecialtyParser {
  public static parse(value: string | readonly string[]): string[] {
    const parts = typeof value === 'string' ? value.split(/[\n,]/) : value;
    return [...new Set(parts.map((part) => part.trim()).filter((part) => part !== ''))];
  }

  public static join(values: readonly string[] | null): string {
    return (values ?? []).join(', ');
  }
}

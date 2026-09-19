export interface OptionShape {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export type PropBag = Readonly<Record<string, unknown>> | undefined;

export class PropReader {
  public static string(props: PropBag, key: string): string | undefined {
    const value = props?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  public static number(props: PropBag, key: string): number | undefined {
    const value = props?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  public static boolean(props: PropBag, key: string): boolean | undefined {
    const value = props?.[key];
    return typeof value === 'boolean' ? value : undefined;
  }

  public static oneOf<TValue extends string>(props: PropBag, key: string, allowed: readonly TValue[]): TValue | undefined {
    return PropReader.narrow(props?.[key], allowed);
  }

  public static narrow<TValue extends string>(value: unknown, allowed: readonly TValue[]): TValue | undefined {
    return allowed.find((candidate) => candidate === value);
  }

  public static array(props: PropBag, key: string): unknown[] {
    const value = props?.[key];
    return Array.isArray(value) ? value : [];
  }

  public static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  public static scalarText(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
  }

  public static options(source: unknown): OptionShape[] {
    if (!Array.isArray(source)) return [];
    return source.flatMap((entry): OptionShape[] => {
      if (typeof entry === 'string') return [{ value: entry, label: entry }];
      if (!PropReader.isRecord(entry) || typeof entry['value'] !== 'string') return [];
      const value = entry['value'];
      const option: OptionShape = { value, label: typeof entry['label'] === 'string' ? entry['label'] : value };
      if (typeof entry['description'] === 'string') option.description = entry['description'];
      if (typeof entry['disabled'] === 'boolean') option.disabled = entry['disabled'];
      if (typeof entry['disabledReason'] === 'string') option.disabledReason = entry['disabledReason'];
      return [option];
    });
  }

  public static stringList(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    return typeof value === 'string' && value !== '' ? [value] : [];
  }
}

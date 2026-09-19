import { z } from 'zod';

export class BodySection {
  public static of<TSchema extends z.ZodType>(key: string, schema: TSchema) {
    return z.preprocess((value) => {
      if (!BodySection.isRecord(value)) {
        return {};
      }
      const inner = value[key];
      return BodySection.isRecord(inner) ? inner : value;
    }, schema);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

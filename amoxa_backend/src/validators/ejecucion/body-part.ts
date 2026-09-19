import { z } from 'zod';

export class BodyPart {
  public static of<TSchema extends z.ZodType>(key: string, schema: TSchema) {
    return z.preprocess((value) => {
      if (!BodyPart.isRecord(value)) {
        return {};
      }
      const inner = value[key];
      return BodyPart.isRecord(inner) ? inner : {};
    }, schema);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

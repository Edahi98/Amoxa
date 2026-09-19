import { z } from 'zod';

export class OptionalValue {
  public static of<TSchema extends z.ZodType>(schema: TSchema) {
    return z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
  }
}

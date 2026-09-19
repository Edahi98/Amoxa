import { z } from 'zod';
import { NestedBodyReader } from '@validators-seguimiento/nested-body.reader.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const NextPeriodSchema = z.preprocess(
  (value) => NestedBodyReader.pick(value, 'siguiente', ['periodo']),
  z.object({
    periodo: safeText.wrap(z.string().trim().min(1).max(50)),
  }),
);

export type NextPeriodInput = z.infer<typeof NextPeriodSchema>;

import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { NestedBodyReader } from '@validators-seguimiento/nested-body.reader.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const ReviewDecisionSchema = z.preprocess(
  (value) => NestedBodyReader.pick(value, 'revision', ['decisiones', 'recursos']),
  z.object({
    decisiones: safeText.wrap(z.string().trim().min(1).max(5000)),
    recursos: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().trim().min(1).max(5000)).optional()),
  }),
);

export type ReviewDecisionInput = z.infer<typeof ReviewDecisionSchema>;

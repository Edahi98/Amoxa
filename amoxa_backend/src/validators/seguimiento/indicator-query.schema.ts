import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const IndicatorQuerySchema = z.object({
  periodo: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().trim().min(1).max(50)).optional()),
  area: z.preprocess(EmptyStringCleaner.toUndefined, z.string().uuid().optional()),
});

export type IndicatorQueryInput = z.infer<typeof IndicatorQuerySchema>;

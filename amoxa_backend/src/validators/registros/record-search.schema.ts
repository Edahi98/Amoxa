import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const RecordSearchSchema = z.object({
  texto: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().trim().min(1).max(200)).optional()),
  tipo: z.preprocess(EmptyStringCleaner.toUndefined, z.string().regex(/^[a-z_]{1,100}$/).optional()),
  page: z.preprocess(EmptyStringCleaner.toUndefined, z.coerce.number().int().min(1).max(10000).optional()),
  pageSize: z.preprocess(EmptyStringCleaner.toUndefined, z.coerce.number().int().min(1).max(100).optional()),
});

export type RecordSearchInput = z.infer<typeof RecordSearchSchema>;

import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const SduiScreenIdSchema = safeText.wrap(z.string().regex(/^[a-z_]+(\.[a-z_]+)?$/).max(64));

export const SduiScreenQuerySchema = z
  .object({
    entityId: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)).optional()),
    entityType: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().regex(/^[A-Za-z_]{1,32}$/)).optional()),
  })
  .strict();

export type SduiScreenQuery = z.infer<typeof SduiScreenQuerySchema>;

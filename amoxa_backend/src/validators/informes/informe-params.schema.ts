import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';

export const InformeIdSchema = z.string().uuid();

export const InformeListQuerySchema = z
  .object({
    auditoriaId: z.preprocess(EmptyStringCleaner.toUndefined, z.string().uuid().optional()),
  })
  .strict();

export type InformeListQuery = z.infer<typeof InformeListQuerySchema>;

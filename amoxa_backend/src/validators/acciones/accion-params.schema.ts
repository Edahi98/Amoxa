import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';

export const AccionIdSchema = z.string().uuid();

export const AccionListQuerySchema = z
  .object({
    estado: z.preprocess(
      EmptyStringCleaner.toUndefined,
      z.enum(['abierta', 'reportada', 'verificada', 'reabierta', 'vencida']).optional(),
    ),
    hallazgoId: z.preprocess(EmptyStringCleaner.toUndefined, z.string().uuid().optional()),
  })
  .strict();

export type AccionListQuery = z.infer<typeof AccionListQuerySchema>;

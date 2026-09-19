import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';

export const NotificationListQuerySchema = z.object({
  soloNoLeidas: z.preprocess(
    EmptyStringCleaner.toUndefined,
    z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  ),
});

export type NotificationListQueryInput = z.infer<typeof NotificationListQuerySchema>;

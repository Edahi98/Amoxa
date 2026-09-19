import { z } from 'zod';
import { PasswordSchema } from '@validators/password.schema.js';

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: PasswordSchema,
  })
  .strict();

export type PasswordChangeInput = z.infer<typeof PasswordChangeSchema>;

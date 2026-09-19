import { z } from 'zod';
import { PasswordSchema } from '@validators/password.schema.js';

export const RestablecerClaveSchema = z
  .object({
    token: z.string().min(1).max(256),
    password: PasswordSchema,
  })
  .strict();

export type RestablecerClaveInput = z.infer<typeof RestablecerClaveSchema>;

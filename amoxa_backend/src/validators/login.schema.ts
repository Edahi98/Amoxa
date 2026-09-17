import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const LoginSchema = z
  .object({
    email: safeText.wrap(z.string().email().max(255)),
    password: z.string().min(1).max(72),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;

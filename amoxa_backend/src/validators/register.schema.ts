import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const RegisterSchema = z
  .object({
    organizacionId: z.string().uuid(),
    nombre: safeText.wrap(z.string().min(1).max(255)),
    email: safeText.wrap(z.string().email().max(255)),
    password: z.string().min(8).max(72),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;

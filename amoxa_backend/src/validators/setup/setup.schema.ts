import { z } from 'zod';
import { PasswordSchema } from '@validators/password.schema.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const SetupSchema = z
  .object({
    setupToken: z.string().min(1).max(256),
    email: safeText.wrap(z.string().email().max(255)),
    nombre: safeText.wrap(z.string().min(1).max(255)),
    password: PasswordSchema,
    organizacionId: z.string().uuid().optional(),
    organizacion: safeText.wrap(z.string().min(1).max(255)).optional(),
  })
  .strict()
  .refine((value) => (value.organizacionId === undefined) !== (value.organizacion === undefined));

export type SetupInput = z.infer<typeof SetupSchema>;

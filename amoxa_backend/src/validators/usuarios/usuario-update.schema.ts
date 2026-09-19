import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const UsuarioUpdateSchema = z
  .object({
    nombre: safeText.wrap(z.string().trim().min(1).max(255)).optional(),
    email: safeText.wrap(z.string().trim().email().max(255)).optional(),
  })
  .strict()
  .refine((value) => value.nombre !== undefined || value.email !== undefined);

export type UsuarioUpdateInput = z.infer<typeof UsuarioUpdateSchema>;

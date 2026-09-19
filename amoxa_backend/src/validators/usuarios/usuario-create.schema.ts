import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';
import { AssignableRoleSchema } from '@validators-usuarios/assignable-role.schema.js';

const safeText = new SafeTextValidator();

export const UsuarioCreateSchema = z
  .object({
    nombre: safeText.wrap(z.string().trim().min(1).max(255)),
    email: safeText.wrap(z.string().trim().email().max(255)),
    rol: AssignableRoleSchema,
    organizacionId: z.string().uuid().optional(),
  })
  .strict();

export type UsuarioCreateInput = z.infer<typeof UsuarioCreateSchema>;

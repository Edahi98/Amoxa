import { z } from 'zod';
import { AssignableRoleSchema } from '@validators-usuarios/assignable-role.schema.js';

export const UsuarioRoleSchema = z.object({ rol: AssignableRoleSchema }).strict();

export type UsuarioRoleInput = z.infer<typeof UsuarioRoleSchema>;

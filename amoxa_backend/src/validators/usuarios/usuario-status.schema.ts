import { z } from 'zod';

export const UsuarioStatusSchema = z.object({ activo: z.boolean() }).strict();

export type UsuarioStatusInput = z.infer<typeof UsuarioStatusSchema>;

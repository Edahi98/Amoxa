import { z } from 'zod';

export const UsuarioIdSchema = z.string().uuid();

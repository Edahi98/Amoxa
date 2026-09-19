import { z } from 'zod';
import type { SessionRole } from '@shared/roles.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const booleanText = z.enum(['true', 'false']).transform((value) => value === 'true');

export const UsuarioListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    rol: z.enum(RoleCatalog.sessionRoles() as [SessionRole, ...SessionRole[]]).optional(),
    activo: booleanText.optional(),
    search: safeText.wrap(z.string().trim().min(1).max(100)).optional(),
  })
  .strict();

export type UsuarioListQuery = z.infer<typeof UsuarioListQuerySchema>;

import { z } from 'zod';
import type { AssignableRole } from '@shared/roles.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';

export const AssignableRoleSchema = z.enum(RoleCatalog.assignable() as [AssignableRole, ...AssignableRole[]]);

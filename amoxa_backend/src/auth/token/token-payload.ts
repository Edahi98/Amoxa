import type { InferSelectModel } from 'drizzle-orm';
import type { usuario } from '@schemas/index.js';

export interface TokenPayload {
  sub: string;
  organizacionId: string;
  email: string;
  rol: InferSelectModel<typeof usuario>['rol'];
  issuedAt: string;
}

import { z } from 'zod';

export const FlujoIdSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

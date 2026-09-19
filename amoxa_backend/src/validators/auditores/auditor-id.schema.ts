import { z } from 'zod';

export const AuditorIdSchema = z.string().uuid();

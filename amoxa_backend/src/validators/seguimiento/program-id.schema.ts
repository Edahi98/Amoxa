import { z } from 'zod';

export const ProgramIdSchema = z.string().uuid();

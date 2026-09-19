import { z } from 'zod';

export const ProgramaIdSchema = z.string().uuid();

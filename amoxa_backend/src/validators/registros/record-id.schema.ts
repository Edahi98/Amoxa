import { z } from 'zod';

export const RecordIdSchema = z.string().uuid();

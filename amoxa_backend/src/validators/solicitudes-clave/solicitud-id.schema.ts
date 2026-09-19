import { z } from 'zod';

export const SolicitudIdSchema = z.string().uuid();

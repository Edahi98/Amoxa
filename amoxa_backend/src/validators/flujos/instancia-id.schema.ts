import { z } from 'zod';

export const InstanciaIdSchema = z.string().uuid();

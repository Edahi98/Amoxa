import { z } from 'zod';

export const FlujoIniciarSchema = z.object({ auditoriaId: z.string().uuid() }).strict();

export type FlujoIniciarInput = z.infer<typeof FlujoIniciarSchema>;

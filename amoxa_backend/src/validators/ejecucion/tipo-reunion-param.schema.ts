import { z } from 'zod';

export const TipoReunionParamSchema = z.enum(['apertura', 'cierre']);

export type TipoReunion = z.infer<typeof TipoReunionParamSchema>;

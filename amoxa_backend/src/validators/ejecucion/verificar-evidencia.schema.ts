import { z } from 'zod';

export const VerificarEvidenciaSchema = z.looseObject({
  verificada: z.boolean().optional(),
  evidencia: z.looseObject({ verificada: z.boolean().optional() }).optional(),
});

export type VerificarEvidenciaInput = z.infer<typeof VerificarEvidenciaSchema>;

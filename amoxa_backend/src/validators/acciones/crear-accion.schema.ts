import { z } from 'zod';
import { PayloadFlattener } from '@validators/payload-flattener.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const CrearAccionSchema = z.preprocess(
  PayloadFlattener.merge('accion'),
  z.object({
    correccion: safeText.wrap(z.string().trim().min(1).max(5000)),
    causa_raiz: safeText.wrap(z.string().trim().min(1).max(5000)),
    responsable_id: z.string().uuid(),
    fecha_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
);

export type CrearAccionInput = z.infer<typeof CrearAccionSchema>;

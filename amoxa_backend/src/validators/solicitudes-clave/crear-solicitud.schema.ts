import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const CrearSolicitudSchema = z
  .object({
    email: safeText.wrap(z.string().email().max(255)),
  })
  .strict();

export type CrearSolicitudInput = z.infer<typeof CrearSolicitudSchema>;

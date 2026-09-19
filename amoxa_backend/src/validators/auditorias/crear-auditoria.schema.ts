import { z } from 'zod';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const CrearAuditoriaSchema = z
  .object({
    plantillaId: z.uuid(),
    liderId: z.uuid(),
    procesoIds: z.array(z.uuid()).min(1).max(100),
    metodo: z.enum(['in_situ', 'remoto', 'mixto']),
    fechaPlan: OptionalField.of(z.iso.date()),
    objetivos: OptionalField.of(safeText.wrap(z.string().max(2000))),
    criterios: z.array(safeText.wrap(z.string().min(1).max(100))).max(100).default([]),
  })
  .strict();

export type CrearAuditoriaInput = z.infer<typeof CrearAuditoriaSchema>;

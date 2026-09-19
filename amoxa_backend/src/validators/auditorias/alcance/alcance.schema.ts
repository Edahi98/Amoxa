import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const AlcanceSchema = BodySection.of(
  'auditoria',
  z.object({
    procesos: z.array(z.uuid()).max(100).default([]),
    criterios: z.array(safeText.wrap(z.string().min(1).max(100))).max(100).default([]),
    plantilla_id: OptionalField.of(z.uuid()),
    metodo: OptionalField.of(z.enum(['in_situ', 'remoto', 'mixto'])),
    objetivos: OptionalField.of(safeText.wrap(z.string().max(2000))),
  }),
);

export type AlcanceInput = z.infer<typeof AlcanceSchema>;

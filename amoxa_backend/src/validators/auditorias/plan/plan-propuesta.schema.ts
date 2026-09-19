import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const PlanPropuestaSchema = BodySection.of(
  'plan',
  z.object({
    fecha_propuesta: OptionalField.of(z.iso.date()),
    motivo_propuesta: OptionalField.of(safeText.wrap(z.string().max(2000))),
  }),
);

export type PlanPropuestaInput = z.infer<typeof PlanPropuestaSchema>;

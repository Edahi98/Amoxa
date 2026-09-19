import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const ContactoConfirmacionSchema = BodySection.of(
  'contacto',
  z.object({
    informacion_suficiente: z.boolean().default(false),
    cooperacion: z.boolean().default(false),
    tiempo: z.boolean().default(false),
    observaciones: OptionalField.of(safeText.wrap(z.string().max(2000))),
  }),
);

export type ContactoConfirmacionInput = z.infer<typeof ContactoConfirmacionSchema>;

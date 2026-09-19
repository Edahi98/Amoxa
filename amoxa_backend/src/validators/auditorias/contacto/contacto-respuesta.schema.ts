import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const ContactoRespuestaSchema = BodySection.of(
  'contacto',
  z.object({
    respuesta: OptionalField.of(safeText.wrap(z.string().max(4000))),
  }),
);

export type ContactoRespuestaInput = z.infer<typeof ContactoRespuestaSchema>;

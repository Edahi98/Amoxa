import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const AlcanceRevisionSchema = BodySection.of(
  'revision',
  z.object({
    comentario: OptionalField.of(safeText.wrap(z.string().max(2000))),
  }),
);

export type AlcanceRevisionInput = z.infer<typeof AlcanceRevisionSchema>;

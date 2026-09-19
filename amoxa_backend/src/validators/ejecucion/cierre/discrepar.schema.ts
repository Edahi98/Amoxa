import { z } from 'zod';
import { BodyPart } from '@validators-ejecucion/body-part.js';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const DiscreparSchema = BodyPart.of(
  'cierre',
  z.looseObject({
    hallazgo_id: z.uuid(),
    motivo_discrepancia: OptionalValue.of(safeText.wrap(z.string().max(4000))),
  }),
);

export type DiscreparInput = z.infer<typeof DiscreparSchema>;

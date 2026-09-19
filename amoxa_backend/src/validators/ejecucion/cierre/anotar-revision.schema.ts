import { z } from 'zod';
import { BodyPart } from '@validators-ejecucion/body-part.js';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const AnotarRevisionSchema = BodyPart.of(
  'cierre',
  z.looseObject({
    hallazgo_id: z.uuid(),
    resultado_area: OptionalValue.of(z.enum(['aceptado', 'discrepa'])),
    comentario: OptionalValue.of(safeText.wrap(z.string().max(2000))),
  }),
);

export type AnotarRevisionInput = z.infer<typeof AnotarRevisionSchema>;

import { z } from 'zod';
import { BodyPart } from '@validators-ejecucion/body-part.js';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const RevisarHallazgoSchema = BodyPart.of(
  'revision',
  z.looseObject({
    comentario: OptionalValue.of(safeText.wrap(z.string().max(2000))),
  }),
);

export type RevisarHallazgoInput = z.infer<typeof RevisarHallazgoSchema>;

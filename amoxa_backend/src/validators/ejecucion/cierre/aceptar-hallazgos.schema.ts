import { z } from 'zod';
import { BodyPart } from '@validators-ejecucion/body-part.js';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';

export const AceptarHallazgosSchema = BodyPart.of(
  'cierre',
  z.looseObject({
    hallazgo_id: OptionalValue.of(z.uuid()),
  }),
);

export type AceptarHallazgosInput = z.infer<typeof AceptarHallazgosSchema>;

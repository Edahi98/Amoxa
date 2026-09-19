import { z } from 'zod';
import { BodyPart } from '@validators-ejecucion/body-part.js';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const RegistrarAperturaSchema = BodyPart.of(
  'apertura',
  z.looseObject({
    asistentes: z.array(z.uuid()).max(100).default([]),
    notas: OptionalValue.of(safeText.wrap(z.string().max(4000))),
  }),
);

export type RegistrarAperturaInput = z.infer<typeof RegistrarAperturaSchema>;

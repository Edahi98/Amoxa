import { z } from 'zod';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const PlantillaBodySchema = z.preprocess(
  NestedPayload.unwrap('plantilla'),
  z.looseObject({
    nombre: safeText.wrap(z.string().trim().min(1).max(255)),
  }),
);

export type PlantillaBody = z.infer<typeof PlantillaBodySchema>;

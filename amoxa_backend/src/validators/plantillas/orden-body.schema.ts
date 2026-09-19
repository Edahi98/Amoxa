import { z } from 'zod';
import { NestedPayload } from '@validators/nested-payload.js';

export const OrdenBodySchema = z.preprocess(
  NestedPayload.unwrap('orden'),
  z.looseObject({
    preguntas: z.array(z.looseObject({ id: z.uuid() })).min(1).max(500),
  }),
);

export type OrdenBody = z.infer<typeof OrdenBodySchema>;

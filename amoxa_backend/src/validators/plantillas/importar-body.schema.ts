import { z } from 'zod';
import { EncodedFileSchema } from '@common-files/encoded-file.schema.js';
import { CriterioMapper } from '@plantillas-rules/criterio-mapper.js';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const ImportarBodySchema = z.preprocess(
  NestedPayload.unwrap('importar'),
  z.looseObject({
    archivo: EncodedFileSchema,
    clausula: safeText.wrap(z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9. _-]+$/)),
    criterio: z.string().refine((value) => CriterioMapper.inputs().includes(value)),
  }),
);

export type ImportarBody = z.infer<typeof ImportarBodySchema>;

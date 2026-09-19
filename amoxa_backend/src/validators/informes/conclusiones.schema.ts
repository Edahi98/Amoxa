import { z } from 'zod';
import { PayloadFlattener } from '@validators/payload-flattener.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const ConclusionesSchema = z.preprocess(
  PayloadFlattener.merge('informe'),
  z.object({
    conclusiones: safeText.wrap(z.string().trim().min(1).max(10000)),
  }),
);

export type ConclusionesInput = z.infer<typeof ConclusionesSchema>;

import { z } from 'zod';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const ProgramaDecisionSchema = z.preprocess(
  NestedPayload.unwrap('decision'),
  z.looseObject({
    motivo_devolucion: z.preprocess(NestedPayload.blank, safeText.wrap(z.string().trim().min(1).max(2000)).optional()),
  }),
);

export type ProgramaDecision = z.infer<typeof ProgramaDecisionSchema>;

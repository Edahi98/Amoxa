import { z } from 'zod';
import { EVALUATION_METHODS } from '@auditores-rules/method-catalog.js';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const EvaluacionBodySchema = z.preprocess(
  NestedPayload.unwrap('evaluacion'),
  z.looseObject({
    metodos: z.array(z.enum(EVALUATION_METHODS)).max(EVALUATION_METHODS.length),
    resultado: z.enum(['satisfactorio', 'no_satisfactorio']),
    observaciones: z.preprocess(NestedPayload.blank, safeText.wrap(z.string().trim().min(1).max(2000)).optional()),
    fecha: z.preprocess(
      NestedPayload.blank,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}/)
        .transform((value) => value.slice(0, 10))
        .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
        .optional(),
    ),
  }),
);

export type EvaluacionBody = z.infer<typeof EvaluacionBodySchema>;

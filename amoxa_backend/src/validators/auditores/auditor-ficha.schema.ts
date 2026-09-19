import { z } from 'zod';
import { SpecialtyParser } from '@auditores-rules/specialty-parser.js';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const text = (max: number) => z.preprocess(NestedPayload.blank, safeText.wrap(z.string().trim().min(1).max(max)).optional());

const specialties = z.preprocess(
  NestedPayload.blank,
  z
    .union([safeText.wrap(z.string().max(1000)), z.array(safeText.wrap(z.string().max(100))).max(50)])
    .transform((value) => SpecialtyParser.parse(value))
    .optional(),
);

export const AuditorFichaSchema = z.preprocess(
  NestedPayload.unwrap('auditor'),
  z.looseObject({
    formacion: text(4000),
    experiencia: text(4000),
    especialidades: specialties,
  }),
);

export type AuditorFichaBody = z.infer<typeof AuditorFichaSchema>;

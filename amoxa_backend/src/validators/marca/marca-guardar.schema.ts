import { z } from 'zod';
import { EncodedFileSchema } from '@common-files/encoded-file.schema.js';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const optionalText = (max: number) =>
  z.preprocess(NestedPayload.blank, safeText.wrap(z.string().trim().min(1).max(max)).optional());

export const MarcaGuardarSchema = z.preprocess(
  NestedPayload.unwrap('marca'),
  z.looseObject({
    color: z.preprocess(NestedPayload.blank, z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional()),
    pie: optionalText(200),
    logo: z.preprocess(NestedPayload.blank, EncodedFileSchema.nullable().optional()),
  }),
);

export type MarcaGuardarInput = z.infer<typeof MarcaGuardarSchema>;

import { z } from 'zod';
import { NestedBodyReader } from '@validators-seguimiento/nested-body.reader.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const LessonSchema = z.preprocess(
  (value) => NestedBodyReader.pick(value, 'revision', ['lecciones']),
  z.object({
    lecciones: safeText.wrap(z.string().trim().min(1).max(5000)),
  }),
);

export type LessonInput = z.infer<typeof LessonSchema>;

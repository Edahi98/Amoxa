import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { PayloadFlattener } from '@validators/payload-flattener.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const SIGNATURE_PATTERN = /^(data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]{16,}|[\p{L}\p{N} .,'-]{2,200})$/u;

export const FirmaSchema = z.preprocess(
  PayloadFlattener.merge('informe'),
  z.object({
    firma: z.string().max(600000).regex(SIGNATURE_PATTERN),
    conclusiones: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().trim().min(1).max(10000)).optional()),
  }),
);

export type FirmaInput = z.infer<typeof FirmaSchema>;

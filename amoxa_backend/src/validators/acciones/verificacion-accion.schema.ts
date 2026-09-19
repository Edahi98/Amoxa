import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { PayloadFlattener } from '@validators/payload-flattener.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';
import { EvidenciaSchema } from '@validators-acciones/evidencia.schema.js';

const safeText = new SafeTextValidator();

export const VerificacionAccionSchema = z.preprocess(
  PayloadFlattener.merge('verificacion'),
  z.object({
    eficaz: z.boolean().optional(),
    evidencias: EvidenciaSchema,
    comentario: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().trim().max(5000)).optional()),
    nueva_fecha: z.preprocess(EmptyStringCleaner.toUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  }),
);

export type VerificacionAccionInput = z.infer<typeof VerificacionAccionSchema>;

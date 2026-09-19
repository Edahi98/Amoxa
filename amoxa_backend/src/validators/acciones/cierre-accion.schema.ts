import { z } from 'zod';
import { EmptyStringCleaner } from '@validators/empty-string-cleaner.js';
import { PayloadFlattener } from '@validators/payload-flattener.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';
import { EvidenciaSchema } from '@validators-acciones/evidencia.schema.js';

const safeText = new SafeTextValidator();

export const CierreAccionSchema = z.preprocess(
  PayloadFlattener.merge('accion'),
  z.object({
    evidencias: EvidenciaSchema,
    comentario_cierre: z.preprocess(EmptyStringCleaner.toUndefined, safeText.wrap(z.string().trim().max(5000)).optional()),
  }),
);

export type CierreAccionInput = z.infer<typeof CierreAccionSchema>;

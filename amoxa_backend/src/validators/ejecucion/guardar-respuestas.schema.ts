import { z } from 'zod';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';
import { ArchivoDeclaradoSchema } from '@validators-ejecucion/subir-evidencia.schema.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const RespuestaItemSchema = z.looseObject({
  result: OptionalValue.of(z.enum(['conforme', 'no_conforme', 'no_aplica', 'C', 'NC', 'NA'])),
  comment: OptionalValue.of(safeText.wrap(z.string().max(2000))),
  evidencias: z.array(ArchivoDeclaradoSchema).max(50).optional(),
});

export const GuardarRespuestasSchema = z.looseObject({
  respuestas: z.record(z.string().max(64), RespuestaItemSchema.nullish()).default({}),
});

export type GuardarRespuestasInput = z.infer<typeof GuardarRespuestasSchema>;

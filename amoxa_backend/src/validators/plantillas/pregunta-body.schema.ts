import { z } from 'zod';
import { CriterioMapper } from '@plantillas-rules/criterio-mapper.js';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const PreguntaBodySchema = z.preprocess(
  NestedPayload.unwrap('pregunta'),
  z.looseObject({
    texto: safeText.wrap(z.string().trim().min(1).max(2000)),
    clausula: safeText.wrap(z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9. _-]+$/)),
    criterio: z.string().refine((value) => CriterioMapper.inputs().includes(value)),
    tipo_respuesta: z.preprocess(NestedPayload.blank, z.enum(['si_no', 'escala', 'texto', 'multiple']).optional()),
    evidencia_obligatoria: z.preprocess(NestedPayload.blank, z.boolean().optional()),
  }),
);

export type PreguntaBody = z.infer<typeof PreguntaBodySchema>;

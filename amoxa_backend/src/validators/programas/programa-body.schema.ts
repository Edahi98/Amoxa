import { z } from 'zod';
import { NestedPayload } from '@validators/nested-payload.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const text = (max: number) =>
  z.preprocess(NestedPayload.blank, safeText.wrap(z.string().trim().min(1).max(max)).optional());

const isoDate = z.preprocess(
  NestedPayload.blank,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .transform((value) => value.slice(0, 10))
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    .optional(),
);

const flag = z.preprocess(NestedPayload.blank, z.boolean().optional());

const processIds = z.preprocess(
  NestedPayload.blank,
  z
    .array(z.string().uuid())
    .max(200)
    .transform((ids) => [...new Set(ids)])
    .optional(),
);

export const ProgramaBodySchema = z.preprocess(
  NestedPayload.unwrap('programa'),
  z.looseObject({
    periodo: text(50),
    objetivos: text(4000),
    riesgos: text(4000),
    fecha_inicio: isoDate,
    fecha_fin: isoDate,
    frecuencia: text(100),
    metodos: text(1000),
    procesos_prioritarios: processIds,
    prioridad_modificada: flag,
    justificacion_prioridad: text(2000),
  }),
);

export type ProgramaBody = z.infer<typeof ProgramaBodySchema>;

import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';
import { EvidenceNormalizer } from '@validators-acciones/evidence-normalizer.js';

const safeText = new SafeTextValidator();

const EvidenceItemSchema = z
  .object({
    nombre: safeText.wrap(z.string().trim().min(1).max(255)).optional(),
    url: safeText.wrap(z.string().max(2048).regex(/^(https?:\/\/|\/)[^\s<>"'`]+$/)).optional(),
    tipo: z
      .string()
      .regex(/^[A-Za-z0-9_\-/.+]{1,30}$/)
      .optional(),
    hash: z
      .string()
      .regex(/^[A-Fa-f0-9]{64}$/)
      .optional(),
  })
  .refine((item) => item.nombre !== undefined || item.url !== undefined);

export const EvidenciaSchema = z.preprocess(EvidenceNormalizer.toItems, z.array(EvidenceItemSchema).max(50));

export type EvidenciaItem = z.infer<typeof EvidenceItemSchema>;

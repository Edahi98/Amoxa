import { z } from 'zod';
import { PayloadFlattener } from '@validators/payload-flattener.js';
import { RecipientNormalizer } from '@validators-informes/recipient-normalizer.js';

export const DistribucionSchema = z.preprocess(
  PayloadFlattener.merge('distribucion'),
  z.object({
    destinatarios: z.preprocess(RecipientNormalizer.toIds, z.array(z.string().uuid()).min(1).max(200)),
  }),
);

export type DistribucionInput = z.infer<typeof DistribucionSchema>;

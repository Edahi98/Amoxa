import { z } from 'zod';

export const MarkReadSchema = z
  .preprocess(
    (value) => (typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}),
    z.object({
      ids: z.array(z.string().uuid()).max(500).optional(),
    }),
  );

export type MarkReadInput = z.infer<typeof MarkReadSchema>;

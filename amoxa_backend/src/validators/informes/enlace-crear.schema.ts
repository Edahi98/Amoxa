import { z } from 'zod';

export const EnlaceCrearSchema = z
  .object({
    dias: z.number().int().min(1).max(30).default(7),
  })
  .strict();

export type EnlaceCrearInput = z.infer<typeof EnlaceCrearSchema>;

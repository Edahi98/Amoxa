import { z } from 'zod';

export const EncodedFileSchema = z
  .object({
    nombre: z.string().min(1).max(255),
    tipo: z.string().max(100).default(''),
    tamano: z.number().int().nonnegative().default(0),
    contenido: z.string().min(1),
  })
  .loose();

export type EncodedFileInput = z.infer<typeof EncodedFileSchema>;

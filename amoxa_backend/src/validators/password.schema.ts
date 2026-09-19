import { z } from 'zod';

export const PasswordSchema = z
  .string()
  .min(12)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72);

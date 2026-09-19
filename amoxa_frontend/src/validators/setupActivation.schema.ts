import { z } from 'zod';

export const SetupActivationSchema = z
  .object({
    nombre: z.string().trim().min(1, 'Ingresa tu nombre').max(255, 'Usa como máximo 255 caracteres'),
    email: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido'),
    organizacion: z.string().trim().min(1, 'Ingresa el nombre de tu organización').max(255, 'Usa como máximo 255 caracteres'),
    password: z.string().min(12, 'Usa al menos 12 caracteres'),
    confirmPassword: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type SetupActivationInput = z.infer<typeof SetupActivationSchema>;
export type SetupActivationErrors = Partial<Record<keyof SetupActivationInput, string>>;

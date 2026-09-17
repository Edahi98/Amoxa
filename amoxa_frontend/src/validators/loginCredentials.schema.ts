import { z } from 'zod';

export const LoginCredentialsSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export type LoginCredentialsInput = z.infer<typeof LoginCredentialsSchema>;
export type LoginCredentialsErrors = Partial<Record<keyof LoginCredentialsInput, string>>;

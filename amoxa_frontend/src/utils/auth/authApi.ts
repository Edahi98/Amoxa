import { AuthApiError } from '@utils-auth/authApiError.js';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface LoginResponse {
  accessToken: string;
}

export class AuthApi {
  public static async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = typeof body?.message === 'string' ? body.message : 'No se pudo iniciar sesión';
      throw new AuthApiError(message);
    }

    return response.json();
  }
}

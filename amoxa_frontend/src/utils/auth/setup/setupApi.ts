import { AuthApiError } from '@utils-auth/authApiError.js';
import { SetupApiError } from '@utils-auth-setup/setupApiError.js';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface SetupPayload {
  setupToken: string;
  nombre: string;
  email: string;
  organizacion: string;
  password: string;
}

export class SetupApi {
  private static readonly OFFLINE_MESSAGE = 'Sin conexión con el servidor. Revisa que esté en marcha e inténtalo de nuevo.';

  private static readonly ERROR_MESSAGES: Readonly<Record<number, string>> = {
    400: 'Revisa los datos e inténtalo de nuevo.',
    403: 'El enlace de activación venció o no es válido.',
    404: 'El sistema ya fue activado.',
    409: 'No se pudo completar la activación con esos datos. Prueba con otro correo u organización.',
    429: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  };

  public static async isInitialized(): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/setup/status`).catch(() => null);
    if (response === null || !response.ok) {
      throw new AuthApiError(SetupApi.OFFLINE_MESSAGE);
    }
    const body = (await response.json()) as { initialized: boolean };
    return body.initialized;
  }

  public static async activate(payload: SetupPayload): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (response === null) {
      throw new SetupApiError(SetupApi.OFFLINE_MESSAGE, 0);
    }
    if (!response.ok) {
      throw new SetupApiError(SetupApi.ERROR_MESSAGES[response.status] ?? 'No se pudo activar el sistema.', response.status);
    }
  }
}

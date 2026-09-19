import { AuthApiError } from '@utils-auth/authApiError.js';

export class SetupApiError extends AuthApiError {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SetupApiError';
    this.status = status;
  }
}

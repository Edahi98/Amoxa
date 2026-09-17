export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

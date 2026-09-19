export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  public get isNetworkError(): boolean {
    return this.status === 0;
  }

  public get isUnauthorized(): boolean {
    return this.status === 401;
  }

  public get isConflict(): boolean {
    return this.status === 409;
  }
}

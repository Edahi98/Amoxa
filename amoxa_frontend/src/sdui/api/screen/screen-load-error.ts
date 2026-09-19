export type ScreenLoadErrorKind = 'unauthorized' | 'forbidden' | 'not_found' | 'network' | 'server' | 'invalid';

export class ScreenLoadError extends Error {
  public readonly kind: ScreenLoadErrorKind;
  public readonly details: readonly string[];

  constructor(kind: ScreenLoadErrorKind, message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'ScreenLoadError';
    this.kind = kind;
    this.details = details;
  }

  public get retryable(): boolean {
    return this.kind === 'network' || this.kind === 'server';
  }
}

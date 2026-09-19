import type { Request } from 'express';
import type { TokenPayload } from '@auth-token/token-payload.js';

export class FakeRequest {
  public readonly user: TokenPayload | undefined;

  constructor(rol?: TokenPayload['rol'], sub = 'u-1', organizacionId = 'o-1') {
    this.user =
      rol === undefined
        ? undefined
        : { sub, organizacionId, email: 'ana@amoxa.test', rol, issuedAt: '2026-01-01T00:00:00.000Z' };
  }

  public asRequest(): Request {
    return this as unknown as Request;
  }
}

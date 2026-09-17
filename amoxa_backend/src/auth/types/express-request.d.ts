import type { TokenPayload } from '@auth-token/token-payload.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export {};

import type { TokenPayload } from '@auth-token/token-payload.js';
import type { SeededUser } from '@testing-database/test-seed.js';

export class TokenFactory {
  public static of(user: SeededUser): TokenPayload {
    return {
      sub: user.id,
      organizacionId: user.organizacionId,
      email: `${user.rol}@amoxa.test`,
      rol: user.rol,
      issuedAt: '2026-01-01T00:00:00.000Z',
    };
  }
}

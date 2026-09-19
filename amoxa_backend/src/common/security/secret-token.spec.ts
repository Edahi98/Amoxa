import { SecretToken } from '@common-security/secret-token.js';

describe('SecretToken', () => {
  it('genera tokens de 32 bytes distintos cada vez', () => {
    const first = SecretToken.generate();
    const second = SecretToken.generate();

    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it('guarda un hash sha256 en hexadecimal, no el token', () => {
    const raw = SecretToken.generate();

    expect(SecretToken.hash(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(SecretToken.hash(raw)).not.toContain(raw);
  });

  it('compara el candidato contra el hash guardado', () => {
    const raw = SecretToken.generate();
    const stored = SecretToken.hash(raw);

    expect(SecretToken.matches(stored, raw)).toBe(true);
    expect(SecretToken.matches(stored, `${raw}x`)).toBe(false);
    expect(SecretToken.matches(null, raw)).toBe(false);
    expect(SecretToken.matches(undefined, raw)).toBe(false);
  });
});

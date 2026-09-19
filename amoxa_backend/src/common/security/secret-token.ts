import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class SecretToken {
  public static generate(): string {
    return randomBytes(32).toString('base64url');
  }

  public static hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  public static matches(storedHash: string | null | undefined, rawCandidate: string): boolean {
    if (!storedHash) {
      return false;
    }
    const stored = Buffer.from(storedHash, 'hex');
    const candidate = Buffer.from(SecretToken.hash(rawCandidate), 'hex');
    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  }
}

import { createHash } from 'node:crypto';

export class FileDigest {
  public static sha256(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }
}

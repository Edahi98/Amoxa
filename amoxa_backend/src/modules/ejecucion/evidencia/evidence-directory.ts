import { resolve } from 'node:path';

export class EvidenceDirectory {
  public static readonly DEFAULT = 'storage/evidencias';

  public static resolve(configured: string | undefined = process.env.EVIDENCE_DIR): string {
    const value = configured === undefined || configured.trim() === '' ? EvidenceDirectory.DEFAULT : configured.trim();
    return resolve(process.cwd(), value);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { EVIDENCE_DIR } from '@ejecucion-evidencia/evidence-dir.token.js';

@Injectable()
export class EvidenceStorage {
  constructor(@Inject(EVIDENCE_DIR) private readonly baseDir: string) {}

  public keyFor(organizacionId: string, auditoriaId: string, adjuntoId: string, safeName: string): string {
    return `${organizacionId}/${auditoriaId}/${adjuntoId}-${safeName}`;
  }

  public async write(key: string, content: Buffer): Promise<void> {
    const target = this.resolvePath(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx', mode: 0o444 });
  }

  public async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  private resolvePath(key: string): string {
    const root = resolve(this.baseDir);
    const target = resolve(root, key);
    if (!target.startsWith(root + sep)) {
      throw new Error('Ruta de evidencia fuera del directorio permitido');
    }
    return target;
  }
}

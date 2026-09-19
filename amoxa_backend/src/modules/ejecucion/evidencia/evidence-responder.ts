import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { ServedEvidence } from '@ejecucion-evidencia/evidence.service.js';
import { EvidencePolicy } from '@ejecucion-evidencia/evidence-policy.js';

export class EvidenceResponder {
  public static stream(response: Response, served: ServedEvidence): StreamableFile {
    response.set({
      'Content-Type': served.mimeType,
      'Content-Disposition': `inline; filename="${EvidencePolicy.sanitizeName(served.fileName)}"`,
      'Content-Length': String(served.content.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(served.content);
  }
}

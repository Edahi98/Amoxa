import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { EvidencePolicy } from '@ejecucion-evidencia/evidence-policy.js';

export class EvidenceUploadOptions {
  public static build(): MulterOptions {
    return {
      limits: { fileSize: EvidencePolicy.MAX_VIDEO_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        const violation = EvidencePolicy.mimeViolation(file.mimetype);
        if (violation !== undefined) {
          callback(new UnsupportedMediaTypeException(violation), false);
          return;
        }
        callback(null, true);
      },
    };
  }
}

import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { DocxFile } from '@docx/docx-file.js';

export class DocxResponder {
  public static stream(response: Response, file: DocxFile): StreamableFile {
    response.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(file.buffer);
  }
}

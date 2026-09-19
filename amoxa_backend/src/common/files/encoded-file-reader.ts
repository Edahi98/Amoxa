import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { EncodedFileInput } from '@common-files/encoded-file.schema.js';

export class EncodedFileReader {
  private static readonly BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

  public static decode(file: Pick<EncodedFileInput, 'contenido'>, maxBytes: number): Buffer {
    const content = file.contenido.replace(/\s+/g, '');
    if (content.length > Math.ceil(maxBytes / 3) * 4 + 4) {
      throw new PayloadTooLargeException('El archivo supera el tamaño máximo permitido.');
    }
    if (content.length % 4 !== 0 || !EncodedFileReader.BASE64.test(content)) {
      throw new BadRequestException('Datos no validos');
    }
    const buffer = Buffer.from(content, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }
    if (buffer.length > maxBytes) {
      throw new PayloadTooLargeException('El archivo supera el tamaño máximo permitido.');
    }
    return buffer;
  }
}

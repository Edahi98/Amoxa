import { EncodedFileReader } from '@common-files/encoded-file-reader.js';
import { BodyLimits } from '@common-http/body-limits.js';

describe('BodyLimits', () => {
  it('el límite del cuerpo JSON cubre un archivo codificado en base64 de 15 MB', () => {
    const limitBytes = Number.parseInt(BodyLimits.JSON, 10) * 1024 * 1024;
    const encoded = Math.ceil((15 * 1024 * 1024) / 3) * 4;

    expect(limitBytes).toBeGreaterThan(encoded);
  });

  it('el lector de archivos acepta hasta el tamaño pedido', () => {
    const content = Buffer.alloc(1024, 1).toString('base64');

    expect(EncodedFileReader.decode({ contenido: content }, 1024)).toHaveLength(1024);
  });
});

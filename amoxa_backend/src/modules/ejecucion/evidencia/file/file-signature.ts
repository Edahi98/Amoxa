export class FileSignature {
  public static matches(mime: string, content: Buffer): boolean {
    switch (mime.toLowerCase()) {
      case 'image/jpeg':
        return FileSignature.startsWith(content, [0xff, 0xd8, 0xff]);
      case 'image/png':
        return FileSignature.startsWith(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      case 'image/webp':
        return FileSignature.ascii(content, 0, 4) === 'RIFF' && FileSignature.ascii(content, 8, 12) === 'WEBP';
      case 'application/pdf':
        return FileSignature.ascii(content, 0, 5) === '%PDF-';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return FileSignature.startsWith(content, [0x50, 0x4b, 0x03, 0x04]);
      case 'video/mp4':
        return FileSignature.ascii(content, 4, 8) === 'ftyp';
      case 'text/plain':
        return !content.subarray(0, 4096).includes(0);
      default:
        return false;
    }
  }

  private static startsWith(content: Buffer, bytes: readonly number[]): boolean {
    return content.length >= bytes.length && bytes.every((byte, index) => content[index] === byte);
  }

  private static ascii(content: Buffer, from: number, to: number): string {
    return content.subarray(from, to).toString('latin1');
  }
}

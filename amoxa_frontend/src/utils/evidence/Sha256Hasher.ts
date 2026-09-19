export class Sha256Hasher {
  public static toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  public static async hashBuffer(buffer: ArrayBuffer): Promise<string> {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    return Sha256Hasher.toHex(digest);
  }

  public static async hashText(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return Sha256Hasher.hashBuffer(buffer);
  }

  public static async hashFile(file: Blob): Promise<string> {
    return Sha256Hasher.hashBuffer(await file.arrayBuffer());
  }

  public static shorten(hash: string): string {
    return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
  }
}

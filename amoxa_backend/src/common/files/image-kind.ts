export type ImageType = 'png' | 'jpg';

export interface ImageSize {
  width: number;
  height: number;
}

export class ImageKind {
  private static readonly PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  public static detect(content: Buffer): ImageType | undefined {
    if (content.length >= 8 && ImageKind.PNG.every((byte, index) => content[index] === byte)) return 'png';
    if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return 'jpg';
    return undefined;
  }

  public static size(content: Buffer, type: ImageType): ImageSize | undefined {
    return type === 'png' ? ImageKind.pngSize(content) : ImageKind.jpgSize(content);
  }

  private static pngSize(content: Buffer): ImageSize | undefined {
    if (content.length < 24) return undefined;
    return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
  }

  private static jpgSize(content: Buffer): ImageSize | undefined {
    let offset = 2;
    while (offset + 9 < content.length) {
      if (content[offset] !== 0xff) return undefined;
      const marker = content[offset + 1];
      const length = content.readUInt16BE(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { height: content.readUInt16BE(offset + 5), width: content.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
    return undefined;
  }
}

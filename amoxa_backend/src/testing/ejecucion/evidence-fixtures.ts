export class EvidenceFixtures {
  public static png(tag = 'a'): Buffer {
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(`contenido-${tag}`)]);
  }

  public static pdf(tag = 'a'): Buffer {
    return Buffer.from(`%PDF-1.4\n${tag}\n%%EOF`);
  }

  public static file(content: Buffer, name = 'foto.png', mimetype = 'image/png') {
    return { originalname: name, mimetype, size: content.length, buffer: content };
  }
}

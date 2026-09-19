export type AttachmentType = 'foto' | 'doc' | 'captura' | 'video';

export class EvidencePolicy {
  public static readonly MAX_BYTES = 15 * 1024 * 1024;
  public static readonly MAX_VIDEO_BYTES = 50 * 1024 * 1024;

  public static readonly SHA256_PATTERN = /^[a-f0-9]{64}$/;

  private static readonly TYPE_BY_MIME: Readonly<Record<string, AttachmentType>> = {
    'image/jpeg': 'foto',
    'image/png': 'foto',
    'image/webp': 'foto',
    'application/pdf': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
    'text/plain': 'doc',
    'video/mp4': 'video',
    'video/webm': 'video',
    'video/quicktime': 'video',
  };

  public static isAllowedMime(mime: string): boolean {
    return Object.hasOwn(EvidencePolicy.TYPE_BY_MIME, mime.toLowerCase());
  }

  public static allowedMimes(): string[] {
    return Object.keys(EvidencePolicy.TYPE_BY_MIME);
  }

  public static typeFor(mime: string, hint?: string): AttachmentType {
    const base = EvidencePolicy.TYPE_BY_MIME[mime.toLowerCase()] ?? 'doc';
    return hint === 'captura' && base === 'foto' ? 'captura' : base;
  }

  public static sanitizeName(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? '';
    const cleaned = base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/\.{2,}/g, '.')
      .replace(/^[.-]+/, '')
      .replace(/-+$/, '');
    if (cleaned === '') {
      return 'archivo';
    }
    if (cleaned.length <= 100) {
      return cleaned;
    }
    const dot = cleaned.lastIndexOf('.');
    const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : '';
    return cleaned.slice(0, 100 - extension.length) + extension;
  }

  public static maxBytesFor(mime?: string): number {
    return mime !== undefined && EvidencePolicy.TYPE_BY_MIME[mime.toLowerCase()] === 'video' ? EvidencePolicy.MAX_VIDEO_BYTES : EvidencePolicy.MAX_BYTES;
  }

  public static sizeViolation(size: number, mime?: string): string | undefined {
    if (size <= 0) {
      return 'El archivo está vacío.';
    }
    const limit = EvidencePolicy.maxBytesFor(mime);
    return size > limit ? `El archivo supera el tamaño máximo permitido (${Math.floor(limit / (1024 * 1024))} MB).` : undefined;
  }

  public static mimeViolation(mime: string): string | undefined {
    return EvidencePolicy.isAllowedMime(mime)
      ? undefined
      : 'Tipo de archivo no permitido. Adjunte una imagen (JPEG, PNG, WebP), PDF, DOCX, TXT o video (MP4, WebM o MOV).';
  }
}

import type { ImageType } from '@common-files/image-kind.js';

export interface DocxBrandLogo {
  data: Buffer;
  type: ImageType;
  width: number;
  height: number;
}

export interface DocxBrand {
  color?: string;
  footer?: string;
  logo?: DocxBrandLogo;
}

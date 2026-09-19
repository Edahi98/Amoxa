export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface DocxFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

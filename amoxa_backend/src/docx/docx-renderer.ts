import { AlignmentType, Document, Footer, Header, PageNumber, Packer, Paragraph, TabStopType, TextRun } from 'docx';
import { DOCX_MIME, type DocxFile } from '@docx/docx-file.js';
import { DocxKit, type DocxBlock } from '@docx/docx-kit.js';
import { DocxStyles } from '@docx/docx-styles.js';

export interface DocxDocumentSpec {
  title: string;
  subtitle?: string;
  organization: string;
  code: string;
  version?: string;
  generatedAt?: Date;
  fileName: string;
  body: readonly DocxBlock[];
}

export class DocxRenderer {
  public static async render(spec: DocxDocumentSpec): Promise<DocxFile> {
    const generatedAt = spec.generatedAt ?? new Date();
    const stamp = DocxRenderer.formatDate(generatedAt);
    const document = new Document({
      creator: 'Amoxa',
      title: spec.title,
      description: `${spec.code} · ${spec.organization}`,
      styles: { default: { document: { run: { font: DocxStyles.FONT, size: DocxStyles.SIZE_BODY, color: DocxStyles.TEXT } } } },
      sections: [
        {
          properties: { page: { margin: { top: 1300, bottom: 1200, left: 1100, right: 1100 } } },
          headers: { default: DocxRenderer.header(spec) },
          footers: { default: DocxRenderer.footer(stamp) },
          children: [
            new Paragraph({
              spacing: { after: 60 },
              children: [DocxKit.text(spec.title, { bold: true, color: DocxStyles.PRIMARY, size: DocxStyles.SIZE_TITLE })],
            }),
            ...(spec.subtitle ? [DocxKit.paragraph(spec.subtitle, { muted: true })] : []),
            DocxKit.spacer(160),
            ...spec.body,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(document);
    return { buffer, fileName: DocxRenderer.safeFileName(spec.fileName), mimeType: DOCX_MIME };
  }

  public static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  }

  public static safeFileName(name: string): string {
    const cleaned = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned.toLowerCase().endsWith('.docx') ? cleaned : `${cleaned || 'documento'}.docx`;
  }

  private static header(spec: DocxDocumentSpec): Header {
    return new Header({
      children: [
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: DocxStyles.PAGE_WIDTH_DXA }],
          children: [
            DocxKit.text(spec.organization, { bold: true, size: DocxStyles.SIZE_SMALL }),
            new TextRun({ text: '\t', font: DocxStyles.FONT }),
            DocxKit.text(`${spec.code}${spec.version ? ` · v${spec.version}` : ''}`, {
              color: DocxStyles.MUTED,
              size: DocxStyles.SIZE_SMALL,
            }),
          ],
        }),
      ],
    });
  }

  private static footer(stamp: string): Footer {
    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            DocxKit.text(`Generado por Amoxa · ${stamp} · Página `, { color: DocxStyles.MUTED, size: DocxStyles.SIZE_SMALL }),
            new TextRun({ children: [PageNumber.CURRENT], font: DocxStyles.FONT, size: DocxStyles.SIZE_SMALL, color: DocxStyles.MUTED }),
            DocxKit.text(' de ', { color: DocxStyles.MUTED, size: DocxStyles.SIZE_SMALL }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: DocxStyles.FONT, size: DocxStyles.SIZE_SMALL, color: DocxStyles.MUTED }),
          ],
        }),
      ],
    });
  }
}

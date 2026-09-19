import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import { extractText, getDocumentProxy } from 'unpdf';

export type ImportKind = 'docx' | 'xlsx' | 'pdf';

export class DocumentTextExtractor {
  private static readonly ENTITIES: Readonly<Record<string, string>> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
  };

  public static kindOf(data: Buffer): ImportKind | undefined {
    if (data.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
    if (data.length > 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) return 'docx';
    return undefined;
  }

  public static async lines(data: Buffer): Promise<string[]> {
    const kind = DocumentTextExtractor.kindOf(data);
    if (kind === 'pdf') return DocumentTextExtractor.fromPdf(data);
    if (kind === undefined) throw new BadRequestException('El archivo debe ser .docx, .xlsx o .pdf.');
    const zip = await DocumentTextExtractor.open(data);
    if (zip.file('word/document.xml') !== null) return DocumentTextExtractor.fromDocx(zip);
    if (zip.file('xl/workbook.xml') !== null) return DocumentTextExtractor.fromXlsx(zip);
    throw new BadRequestException('El archivo debe ser .docx, .xlsx o .pdf.');
  }

  private static async open(data: Buffer): Promise<JSZip> {
    try {
      return await JSZip.loadAsync(data);
    } catch {
      throw new BadRequestException('No se pudo leer el archivo.');
    }
  }

  private static async fromPdf(data: Buffer): Promise<string[]> {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(data));
      const { text } = await extractText(pdf, { mergePages: true });
      return text.split(/\r?\n/);
    } catch {
      throw new BadRequestException('No se pudo leer el archivo.');
    }
  }

  private static async fromDocx(zip: JSZip): Promise<string[]> {
    const xml = await zip.file('word/document.xml')!.async('string');
    return xml
      .split(/<\/w:p>/)
      .map((paragraph) => DocumentTextExtractor.textOf(paragraph.replace(/<w:tab\/>/g, ' ').replace(/<w:br\/>/g, ' ')))
      .filter((line) => line !== '');
  }

  private static async fromXlsx(zip: JSZip): Promise<string[]> {
    const shared = zip.file('xl/sharedStrings.xml');
    const strings = shared === null ? [] : DocumentTextExtractor.sharedStrings(await shared.async('string'));
    const sheets = Object.keys(zip.files)
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const lines: string[] = [];
    for (const name of sheets) {
      const xml = await zip.file(name)!.async('string');
      for (const row of xml.match(/<row\b[\s\S]*?<\/row>/g) ?? []) {
        const cells = (row.match(/<c\b[\s\S]*?<\/c>/g) ?? []).map((cell) => DocumentTextExtractor.cellText(cell, strings));
        const longest = cells.reduce((best, cell) => (cell.length > best.length ? cell : best), '');
        if (longest !== '') lines.push(longest);
      }
    }
    return lines;
  }

  private static sharedStrings(xml: string): string[] {
    return (xml.match(/<si\b[\s\S]*?<\/si>/g) ?? []).map((item) => DocumentTextExtractor.textOf(item));
  }

  private static cellText(cell: string, strings: readonly string[]): string {
    if (/\bt="s"/.test(cell)) {
      const index = Number(/<v>(\d+)<\/v>/.exec(cell)?.[1]);
      return Number.isInteger(index) ? (strings[index] ?? '') : '';
    }
    if (/\bt="inlineStr"/.test(cell)) return DocumentTextExtractor.textOf(cell);
    return '';
  }

  private static textOf(xml: string): string {
    const parts = (xml.match(/<(?:w:t|t)\b[^>]*>[\s\S]*?<\/(?:w:t|t)>/g) ?? []).map((node) =>
      node.replace(/^<[^>]*>/, '').replace(/<\/[^>]*>$/, ''),
    );
    return DocumentTextExtractor.decode(parts.join('')).replace(/\s+/g, ' ').trim();
  }

  private static decode(text: string): string {
    return text
      .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => DocumentTextExtractor.ENTITIES[entity] ?? entity);
  }
}

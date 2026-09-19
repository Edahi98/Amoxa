import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { DocxStyles } from '@docx/docx-styles.js';

export type DocxBlock = Paragraph | Table;

export class DocxKit {
  public static text(value: string, options: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}): TextRun {
    return new TextRun({
      text: value,
      bold: options.bold,
      italics: options.italics,
      color: options.color ?? DocxStyles.TEXT,
      size: options.size ?? DocxStyles.SIZE_BODY,
      font: DocxStyles.FONT,
    });
  }

  public static heading(value: string, level: 1 | 2 = 1): Paragraph {
    return new Paragraph({
      heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      spacing: { before: level === 1 ? 320 : 200, after: 120 },
      keepNext: true,
      children: [
        DocxKit.text(value, {
          bold: true,
          color: DocxStyles.PRIMARY,
          size: level === 1 ? DocxStyles.SIZE_H1 : DocxStyles.SIZE_H2,
        }),
      ],
    });
  }

  public static paragraph(value: string, options: { bold?: boolean; italics?: boolean; muted?: boolean; align?: 'left' | 'center' | 'right' } = {}): Paragraph {
    return new Paragraph({
      spacing: { after: 120, line: 300 },
      alignment: DocxKit.alignment(options.align),
      children: [DocxKit.text(value, { bold: options.bold, italics: options.italics, color: options.muted ? DocxStyles.MUTED : undefined })],
    });
  }

  public static bullets(items: readonly string[]): Paragraph[] {
    return items.map(
      (item) =>
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60, line: 288 },
          children: [DocxKit.text(item)],
        }),
    );
  }

  public static numbered(items: readonly string[]): Paragraph[] {
    return items.map(
      (item, index) =>
        new Paragraph({
          spacing: { after: 60, line: 288 },
          indent: { left: 360, hanging: 360 },
          children: [DocxKit.text(`${index + 1}. ${item}`)],
        }),
    );
  }

  public static spacer(after = 120): Paragraph {
    return new Paragraph({ spacing: { after }, children: [] });
  }

  public static note(value: string): Paragraph {
    return new Paragraph({
      spacing: { before: 80, after: 120 },
      children: [DocxKit.text(value, { italics: true, color: DocxStyles.MUTED, size: DocxStyles.SIZE_SMALL })],
    });
  }

  public static keyValueTable(rows: readonly (readonly [string, string])[]): Table {
    const labelWidth = Math.round(DocxStyles.PAGE_WIDTH_DXA * 0.32);
    return DocxKit.table(
      rows.map(
        ([label, value]) =>
          new TableRow({
            cantSplit: true,
            children: [
              DocxKit.cell(label, { width: labelWidth, bold: true, fill: DocxStyles.LABEL_FILL }),
              DocxKit.cell(value, { width: DocxStyles.PAGE_WIDTH_DXA - labelWidth }),
            ],
          }),
      ),
      [labelWidth, DocxStyles.PAGE_WIDTH_DXA - labelWidth],
    );
  }

  public static dataTable(
    headers: readonly string[],
    rows: readonly (readonly string[])[],
    weights?: readonly number[],
  ): Table {
    const widths = DocxKit.widths(headers.length, weights);
    const headerRow = new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: headers.map((header, index) =>
        DocxKit.cell(header, { width: widths[index], bold: true, fill: DocxStyles.HEADER_FILL }),
      ),
    });
    const bodyRows =
      rows.length === 0
        ? [
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: headers.length,
                  borders: DocxKit.borders(),
                  margins: DocxKit.margins(),
                  children: [DocxKit.paragraph('Sin registros.', { italics: true, muted: true })],
                }),
              ],
            }),
          ]
        : rows.map(
            (row) =>
              new TableRow({
                cantSplit: true,
                children: row.map((value, index) => DocxKit.cell(value, { width: widths[index] })),
              }),
          );
    return DocxKit.table([headerRow, ...bodyRows], widths);
  }

  public static fieldRow(label: string, value?: string): Table {
    const labelWidth = Math.round(DocxStyles.PAGE_WIDTH_DXA * 0.32);
    return DocxKit.table(
      [
        new TableRow({
          cantSplit: true,
          height: { value: 480, rule: 'atLeast' },
          children: [
            DocxKit.cell(label, { width: labelWidth, bold: true, fill: DocxStyles.LABEL_FILL }),
            DocxKit.cell(value ?? '', { width: DocxStyles.PAGE_WIDTH_DXA - labelWidth }),
          ],
        }),
      ],
      [labelWidth, DocxStyles.PAGE_WIDTH_DXA - labelWidth],
    );
  }

  public static checkboxLine(options: readonly string[], selected?: string): Paragraph {
    return new Paragraph({
      spacing: { after: 100 },
      children: options.flatMap((option, index) => [
        DocxKit.text(option === selected ? '☒ ' : '☐ '),
        DocxKit.text(index < options.length - 1 ? `${option}      ` : option),
      ]),
    });
  }

  public static signatureBlock(labels: readonly string[]): Table {
    const width = Math.floor(DocxStyles.PAGE_WIDTH_DXA / labels.length);
    return new Table({
      width: { size: DocxStyles.PAGE_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: labels.map(() => width),
      borders: DocxKit.noBorders(),
      rows: [
        new TableRow({
          height: { value: 900, rule: 'atLeast' },
          children: labels.map(
            () =>
              new TableCell({
                width: { size: width, type: WidthType.DXA },
                borders: { ...DocxKit.noBorders(), bottom: { style: BorderStyle.SINGLE, size: 6, color: DocxStyles.MUTED } },
                margins: DocxKit.margins(),
                children: [DocxKit.spacer(0)],
              }),
          ),
        }),
        new TableRow({
          children: labels.map(
            (label) =>
              new TableCell({
                width: { size: width, type: WidthType.DXA },
                borders: DocxKit.noBorders(),
                margins: DocxKit.margins(),
                children: [DocxKit.paragraph(label, { align: 'center', muted: true })],
              }),
          ),
        }),
      ],
    });
  }

  private static table(rows: TableRow[], widths: readonly number[]): Table {
    return new Table({
      width: { size: DocxStyles.PAGE_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [...widths],
      borders: DocxKit.borders(),
      rows,
    });
  }

  private static cell(value: string, options: { width: number; bold?: boolean; fill?: string }): TableCell {
    return new TableCell({
      width: { size: options.width, type: WidthType.DXA },
      borders: DocxKit.borders(),
      margins: DocxKit.margins(),
      shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill, color: 'auto' } : undefined,
      children: value.split('\n').map(
        (line) =>
          new Paragraph({
            spacing: { after: 40 },
            children: [DocxKit.text(line, { bold: options.bold, size: DocxStyles.SIZE_SMALL + 2 })],
          }),
      ),
    });
  }

  private static widths(columns: number, weights?: readonly number[]): number[] {
    const source = weights !== undefined && weights.length === columns ? weights : Array.from({ length: columns }, () => 1);
    const total = source.reduce((sum, weight) => sum + weight, 0);
    return source.map((weight) => Math.floor((DocxStyles.PAGE_WIDTH_DXA * weight) / total));
  }

  private static alignment(align?: 'left' | 'center' | 'right') {
    if (align === 'center') return AlignmentType.CENTER;
    if (align === 'right') return AlignmentType.RIGHT;
    return AlignmentType.LEFT;
  }

  private static margins() {
    return { top: 70, bottom: 70, left: 110, right: 110 };
  }

  private static borders() {
    const side = { style: BorderStyle.SINGLE, size: 4, color: DocxStyles.BORDER };
    return { top: side, bottom: side, left: side, right: side, insideHorizontal: side, insideVertical: side };
  }

  private static noBorders() {
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  }
}

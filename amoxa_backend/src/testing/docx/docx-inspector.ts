import JSZip from 'jszip';

export class DocxInspector {
  public static async text(buffer: Buffer): Promise<string> {
    const zip = await JSZip.loadAsync(buffer);
    const entry = zip.file('word/document.xml');
    if (entry === null) {
      throw new Error('El archivo no contiene word/document.xml');
    }
    const xml = await entry.async('string');
    return xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  public static async parts(buffer: Buffer): Promise<string[]> {
    const zip = await JSZip.loadAsync(buffer);
    return Object.keys(zip.files);
  }

  public static async headerText(buffer: Buffer): Promise<string> {
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files).filter((name) => /^word\/header\d*\.xml$/.test(name));
    const chunks = await Promise.all(names.map((name) => zip.file(name)!.async('string')));
    return chunks.join(' ').replace(/<[^>]+>/g, '');
  }
}

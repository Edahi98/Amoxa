export interface EncodedFile {
  nombre: string;
  tipo: string;
  tamano: number;
  contenido: string;
}

export class FileEncoder {
  public static readonly DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

  public static async encode(file: File): Promise<EncodedFile> {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
    return { nombre: file.name, tipo: file.type, tamano: file.size, contenido: url.slice(url.indexOf(',') + 1) };
  }

  public static violation(file: Pick<File, 'name' | 'size' | 'type'>, accept: string, maxBytes: number): string | undefined {
    if (file.size === 0) return 'El archivo está vacío.';
    if (file.size > maxBytes) return `El archivo supera el tamaño máximo (${Math.floor(maxBytes / (1024 * 1024))} MB).`;
    return FileEncoder.accepts(file, accept) ? undefined : 'Este tipo de archivo no está permitido.';
  }

  public static accepts(file: Pick<File, 'name' | 'type'>, accept: string): boolean {
    const rules = accept
      .split(',')
      .map((rule) => rule.trim().toLowerCase())
      .filter((rule) => rule !== '');
    if (rules.length === 0) return true;
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return rules.some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule);
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
  }
}

export class EvidenceNormalizer {
  public static toItems(value: unknown): unknown {
    if (value === undefined || value === null) {
      return [];
    }
    const list = Array.isArray(value) ? value : [value];
    return list.map((entry) => {
      if (typeof entry === 'string') {
        return /^(https?:\/\/|\/)/.test(entry) ? { url: entry } : { nombre: entry };
      }
      if (entry !== null && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        return {
          nombre: record['nombre'] ?? record['name'] ?? record['filename'],
          url: record['url'] ?? record['uri'],
          tipo: record['tipo'] ?? record['type'],
          hash: record['hash'] ?? record['sha256'],
        };
      }
      return entry;
    });
  }
}

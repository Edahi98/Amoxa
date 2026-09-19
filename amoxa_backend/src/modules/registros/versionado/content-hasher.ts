import { createHash } from 'node:crypto';

export class ContentHasher {
  public static sha256(content: unknown): string {
    return createHash('sha256').update(ContentHasher.canonical(content)).digest('hex');
  }

  public static canonical(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value) ?? 'null';
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => ContentHasher.canonical(item)).join(',')}]`;
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${ContentHasher.canonical(item)}`);
    return `{${entries.join(',')}}`;
  }
}

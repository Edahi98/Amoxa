export class RecipientNormalizer {
  public static toIds(value: unknown): unknown {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((entry) => {
      if (entry !== null && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        return record['value'] ?? record['id'];
      }
      return entry;
    });
  }
}

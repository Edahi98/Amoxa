export class CssTokenReader {
  public static read(names: readonly string[]): Record<string, string> {
    if (typeof document === 'undefined') {
      return {};
    }
    const styles = getComputedStyle(document.documentElement);
    const tokens: Record<string, string> = {};
    for (const name of names) {
      tokens[name] = styles.getPropertyValue(name).trim();
    }
    return tokens;
  }
}

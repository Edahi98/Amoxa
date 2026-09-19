import type { PathTokenizer } from '@sdui-path/path-tokenizer';

export class PathWriter {
  private readonly tokenizer: PathTokenizer;

  constructor(tokenizer: PathTokenizer) {
    this.tokenizer = tokenizer;
  }

  public set<TSource>(source: TSource, path: string, value: unknown): TSource {
    return this.setTokens(source, this.tokenizer.tokenize(path), value) as TSource;
  }

  private setTokens(source: unknown, tokens: readonly string[], value: unknown): unknown {
    if (tokens.length === 0) return value;

    const [head, ...rest] = tokens;

    if (Array.isArray(source) && this.isIndex(head)) {
      const copy = source.slice();
      copy[Number(head)] = this.setTokens(copy[Number(head)], rest, value);
      return copy;
    }

    if (this.isRecord(source)) {
      return { ...source, [head]: this.setTokens(source[head], rest, value) };
    }

    if (this.isIndex(head)) {
      const created: unknown[] = [];
      created[Number(head)] = this.setTokens(undefined, rest, value);
      return created;
    }

    return { [head]: this.setTokens(undefined, rest, value) };
  }

  private isIndex(token: string): boolean {
    return /^(0|[1-9]\d*)$/.test(token);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

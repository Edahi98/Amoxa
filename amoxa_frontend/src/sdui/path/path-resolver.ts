import { PathTokenizer } from '@sdui-path/path-tokenizer';

export class PathResolver {
  private readonly tokenizer: PathTokenizer;

  constructor(tokenizer: PathTokenizer) {
    this.tokenizer = tokenizer;
  }

  public resolve(source: unknown, path: string): unknown {
    return this.resolveTokens(source, this.tokenizer.tokenize(path));
  }

  private resolveTokens(source: unknown, tokens: readonly string[]): unknown {
    if (tokens.length === 0) return source;
    if (source === null || source === undefined) return undefined;

    const [head, ...rest] = tokens;
    const next = typeof source === 'object' ? (source as Record<string, unknown>)[head] : undefined;
    return this.resolveTokens(next, rest);
  }
}

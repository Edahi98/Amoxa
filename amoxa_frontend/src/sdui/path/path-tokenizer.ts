
export class PathTokenizer {
  public tokenize(path: string): string[] {
    const matches = path.match(/[^.[\]]+/g);
    return matches ?? [];
  }
}

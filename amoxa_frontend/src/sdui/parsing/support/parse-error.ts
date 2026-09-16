export class ParseError {
  public readonly path: string;
  public readonly message: string;

  constructor(path: string, message: string) {
    this.path = path;
    this.message = message;
  }
}

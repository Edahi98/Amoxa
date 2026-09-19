import { ParseError } from '@sdui-parsing-support-parse/parse-error';

export class ParseErrorCollector {
  private readonly items: ParseError[] = [];

  public add(path: string, message: string): void {
    this.items.push(new ParseError(path, message));
  }

  public get errors(): readonly ParseError[] {
    return this.items;
  }

  public get hasErrors(): boolean {
    return this.items.length > 0;
  }
}

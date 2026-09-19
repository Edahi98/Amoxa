import type { ParseError } from '@sdui-parsing-support-parse/parse-error';

export class ParseResult<TValue> {
  public readonly ok: boolean;
  public readonly value: TValue | undefined;
  public readonly errors: readonly ParseError[];

  private constructor(ok: boolean, value: TValue | undefined, errors: readonly ParseError[]) {
    this.ok = ok;
    this.value = value;
    this.errors = errors;
  }

  public static ok<TValue>(value: TValue): ParseResult<TValue> {
    return new ParseResult<TValue>(true, value, []);
  }

  public static fail<TValue>(errors: readonly ParseError[]): ParseResult<TValue> {
    return new ParseResult<TValue>(false, undefined, errors);
  }
}

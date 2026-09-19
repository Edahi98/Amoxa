import type { InputGuard } from '@sdui-parsing-support/input-guard';
import type { ParseErrorCollector } from '@sdui-parsing-support-parse/parse-error-collector';

export abstract class AbstractNodeParser<TResult> {
  protected readonly guard: InputGuard;

  protected constructor(guard: InputGuard) {
    this.guard = guard;
  }

  public parse(input: unknown, path: string, errors: ParseErrorCollector): TResult | undefined {
    if (!this.guard.isRecord(input)) {
      errors.add(path, this.describeExpectedShape());
      return undefined;
    }
    return this.parseRecord(input, path, errors);
  }

  protected abstract describeExpectedShape(): string;

  protected abstract parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): TResult | undefined;

  protected parseArray<TItem>(
    input: unknown,
    path: string,
    errors: ParseErrorCollector,
    itemParser: AbstractNodeParser<TItem>,
  ): TItem[] | undefined {
    if (!Array.isArray(input)) {
      errors.add(path, 'se esperaba un arreglo');
      return undefined;
    }

    const result: TItem[] = [];
    let hasError = false;
    input.forEach((item, index) => {
      const parsed = itemParser.parse(item, `${path}[${index}]`, errors);
      if (parsed === undefined) {
        hasError = true;
        return;
      }
      result.push(parsed);
    });
    return hasError ? undefined : result;
  }
}

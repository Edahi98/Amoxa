import type { PathResolver } from '@sdui-path/path-resolver';

export interface ResolvedEndpoint {
  value: string;
  missing: string[];
}

export class PlaceholderResolver {
  private static readonly PATTERN = /\{([^{}]+)\}/g;
  private static readonly WHOLE = /^\{([^{}]+)\}$/;

  private readonly pathResolver: PathResolver;

  constructor(pathResolver: PathResolver) {
    this.pathResolver = pathResolver;
  }

  public endpoint(template: string, source: unknown): ResolvedEndpoint {
    const separator = template.indexOf('?');
    const pathPart = separator === -1 ? template : template.slice(0, separator);
    const queryPart = separator === -1 ? '' : template.slice(separator);
    const missing: string[] = [];

    const path = pathPart.replace(PlaceholderResolver.PATTERN, (_match, expression: string) => {
      const value = this.pathResolver.resolve(source, expression.trim());
      if (!this.isUsable(value)) {
        missing.push(expression.trim());
        return '';
      }
      return encodeURIComponent(String(value));
    });

    const query = queryPart.replace(PlaceholderResolver.PATTERN, (_match, expression: string) => {
      const value = this.pathResolver.resolve(source, expression.trim());
      return this.isUsable(value) ? encodeURIComponent(String(value)) : '';
    });

    return { value: `${path}${query}`, missing };
  }

  public text(template: string, source: unknown): string {
    return template.replace(PlaceholderResolver.PATTERN, (_match, expression: string) => {
      const value = this.pathResolver.resolve(source, expression.trim());
      return this.isUsable(value) ? String(value) : '';
    });
  }

  public deep(value: unknown, source: unknown): unknown {
    if (typeof value === 'string') {
      const whole = PlaceholderResolver.WHOLE.exec(value);
      return whole ? this.pathResolver.resolve(source, whole[1].trim()) : this.text(value, source);
    }
    if (Array.isArray(value)) return value.map((item) => this.deep(item, source));
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, this.deep(entry, source)]));
    }
    return value;
  }

  private isUsable(value: unknown): value is string | number | boolean {
    if (typeof value === 'string') return value !== '';
    return typeof value === 'number' || typeof value === 'boolean';
  }
}

import type { Request } from 'express';

export class BearerToken {
  private static readonly PREFIX = 'Bearer ';

  public static from(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith(BearerToken.PREFIX)) {
      return undefined;
    }
    return header.slice(BearerToken.PREFIX.length);
  }
}

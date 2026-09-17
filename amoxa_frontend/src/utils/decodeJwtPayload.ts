export class JwtPayloadDecoder {
  public static decode<TPayload>(token: string): TPayload | null {
    const segments = token.split('.');
    if (segments.length !== 3) return null;

    try {
      const json = atob(segments[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json) as TPayload;
    } catch {
      return null;
    }
  }
}

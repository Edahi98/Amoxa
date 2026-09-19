export class SolicitudUrl {
  private static readonly DEFAULT_BASE = 'http://localhost:5173';
  private static readonly PATH = '/establecer-clave';

  public static build(rawToken: string, base: string = SolicitudUrl.baseFromEnv()): string {
    return `${base.replace(/\/+$/, '')}${SolicitudUrl.PATH}?token=${encodeURIComponent(rawToken)}`;
  }

  private static baseFromEnv(): string {
    return process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? SolicitudUrl.DEFAULT_BASE;
  }
}

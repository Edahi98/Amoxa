export interface CorsSettings {
  origin: string;
  exposedHeaders: string[];
}

export class CorsOptions {
  public static readonly DEFAULT_ORIGIN = 'http://localhost:5173';
  public static readonly EXPOSED_HEADERS: readonly string[] = ['Content-Disposition'];

  public static build(origin: string | undefined = process.env.CORS_ORIGIN): CorsSettings {
    return { origin: origin ?? CorsOptions.DEFAULT_ORIGIN, exposedHeaders: [...CorsOptions.EXPOSED_HEADERS] };
  }
}

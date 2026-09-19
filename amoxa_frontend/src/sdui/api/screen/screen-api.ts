import { ApiClient } from '@utils-api/ApiClient.js';
import { ApiError } from '@utils-api/ApiError.js';
import { ScreenLoadError } from '@sdui-api-screen/screen-load-error';
import { ScreenParserFactory } from '@sdui-parsing/screen-parser-factory';
import { BrowserStorage } from '@sdui-offline-storage/browser-storage';
import { ScreenCache } from '@sdui-offline/screen-cache';
import type { ScreenModel } from '@sdui-model-screen/screen.model';
import type { ParseResult } from '@sdui-parsing-support-parse/parse-result';

export interface ScreenLoadRequest {
  screenId: string;
  token: string | null;
  entityId?: string;
  entityType?: string;
  scope?: string;
  signal?: AbortSignal;
}

export class ScreenApi {
  private static sharedInstance: ScreenApi | null = null;

  private readonly cache: ScreenCache | undefined;

  constructor(cache?: ScreenCache) {
    this.cache = cache;
  }

  public static shared(): ScreenApi {
    if (!ScreenApi.sharedInstance) {
      ScreenApi.sharedInstance = new ScreenApi(new ScreenCache(new BrowserStorage()));
    }
    return ScreenApi.sharedInstance;
  }

  public static clearCache(): void {
    new ScreenCache(new BrowserStorage()).clear();
  }

  public async load(request: ScreenLoadRequest): Promise<ScreenModel> {
    const cacheKey = ScreenCache.key(request.scope ?? 'anon', request.screenId, request.entityType, request.entityId);
    let raw: unknown;

    try {
      raw = await ApiClient.request<unknown>({
        path: `/sdui/screens/${encodeURIComponent(request.screenId)}`,
        query: { entityId: request.entityId, entityType: request.entityType },
        token: request.token,
        signal: request.signal,
      });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      const cached = error.isNetworkError ? this.cache?.read(cacheKey) : undefined;
      if (cached === undefined) throw ScreenApi.translate(error);
      return ScreenApi.parse(cached);
    }

    const screen = ScreenApi.parse(raw);
    const ttl = screen.context.offline?.enabled ? (screen.context.offline.cacheTtlSeconds ?? 0) : 0;
    if (ttl > 0) this.cache?.write(cacheKey, raw, ttl);
    return screen;
  }

  private static parse(raw: unknown): ScreenModel {
    const result: ParseResult<ScreenModel> = ScreenParserFactory.create().parseScreen(raw);
    if (!result.ok || result.value === undefined) {
      throw new ScreenLoadError(
        'invalid',
        'La pantalla recibida no tiene un formato válido.',
        result.errors.map((entry) => `${entry.path}: ${entry.message}`),
      );
    }
    return result.value;
  }

  private static translate(error: ApiError): ScreenLoadError {
    switch (error.status) {
      case 0:
        return new ScreenLoadError('network', 'No hay conexión con el servidor.');
      case 401:
        return new ScreenLoadError('unauthorized', 'Tu sesión expiró. Inicia sesión de nuevo.');
      case 403:
        return new ScreenLoadError('forbidden', 'No tienes permiso para ver esta pantalla.');
      case 404:
        return new ScreenLoadError('not_found', 'Esta pantalla no existe.');
      default:
        return new ScreenLoadError('server', 'El servidor no pudo cargar la pantalla.');
    }
  }
}

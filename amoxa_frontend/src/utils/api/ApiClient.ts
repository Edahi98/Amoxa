import { ApiDownload } from '@utils-api/ApiDownload.js';
import { ApiError } from '@utils-api/ApiError.js';
import { SessionExpiredBus } from '@utils-api/SessionExpiredBus.js';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  method?: ApiMethod;
  path: string;
  token?: string | null;
  body?: unknown;
  query?: Readonly<Record<string, string | undefined>>;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}

export class ApiClient {
  public static baseUrl(): string {
    return import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  }

  public static async request<TResponse>(request: ApiRequest): Promise<TResponse> {
    const method = request.method ?? 'GET';
    const headers: Record<string, string> = { Accept: 'application/json', ...request.headers };
    if (request.token) headers['Authorization'] = `Bearer ${request.token}`;
    const hasBody = request.body !== undefined && method !== 'GET';
    if (hasBody) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(ApiClient.url(request), {
        method,
        headers,
        body: hasBody ? JSON.stringify(request.body) : undefined,
        signal: request.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError('No hay conexión con el servidor', 0, null);
    }

    if (response.ok && ApiClient.isAttachment(response)) {
      return (await ApiClient.readDownload(response)) as TResponse;
    }

    const body = await ApiClient.readBody(response);

    if (!response.ok) {
      if (response.status === 401) SessionExpiredBus.notify();
      throw new ApiError(ApiClient.messageOf(body, response.status), response.status, body);
    }

    return body as TResponse;
  }

  private static url(request: ApiRequest): string {
    const base = ApiClient.baseUrl().replace(/\/+$/, '');
    const path = request.path.startsWith('/') ? request.path : `/${request.path}`;
    const params = Object.entries(request.query ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '');
    if (params.length === 0) return `${base}${path}`;

    const search = params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
    return `${base}${path}${path.includes('?') ? '&' : '?'}${search}`;
  }

  private static isAttachment(response: Response): boolean {
    return /^s*attachment/i.test(response.headers.get('Content-Disposition') ?? '');
  }

  private static async readDownload(response: Response): Promise<ApiDownload> {
    const blob = await response.blob();
    return new ApiDownload(blob, ApiClient.fileNameOf(response.headers.get('Content-Disposition')));
  }

  private static fileNameOf(disposition: string | null): string {
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? '');
    if (encoded) {
      try {
        return decodeURIComponent(encoded[1].trim());
      } catch {
        return encoded[1].trim();
      }
    }
    const plain = /filename="?([^";]+)"?/i.exec(disposition ?? '');
    return plain ? plain[1].trim() : 'documento.docx';
  }

  private static async readBody(response: Response): Promise<unknown> {
    if (response.status === 204) return undefined;
    const text = await response.text().catch(() => '');
    if (text === '') return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private static messageOf(body: unknown, status: number): string {
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string' && message !== '') return message;
    }
    return `La solicitud falló (${status})`;
  }
}

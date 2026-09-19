import { ApiClient } from '@utils-api/ApiClient.js';
import { ApiDownload } from '@utils-api/ApiDownload.js';
import { ApiError } from '@utils-api/ApiError.js';
import { FakeFetch } from '@sdui-testing-fake/fake-fetch';

describe('ApiClient', () => {
  afterEach(() => {
    FakeFetch.restore();
  });

  it('devuelve un ApiDownload cuando la respuesta es un adjunto', async () => {
    FakeFetch.install(() => ({
      status: 200,
      bytes: new Uint8Array([1, 2, 3]),
      headers: { 'Content-Disposition': 'attachment; filename="informe-2026.docx"' },
    }));

    const result = await ApiClient.request<ApiDownload>({ path: '/informes/1/documento', token: 't' });

    expect(result).toBeInstanceOf(ApiDownload);
    expect(result.fileName).toBe('informe-2026.docx');
    expect(result.blob.size).toBe(3);
  });

  it('decodifica filename* con UTF-8 y usa un nombre por defecto si falta', async () => {
    FakeFetch.install(() => ({
      status: 200,
      bytes: new Uint8Array([1]),
      headers: { 'Content-Disposition': "attachment; filename*=UTF-8''Auditor%C3%ADa.docx" },
    }));
    const encoded = await ApiClient.request<ApiDownload>({ path: '/x' });
    expect(encoded.fileName).toBe('Auditoría.docx');

    FakeFetch.install(() => ({ status: 200, bytes: new Uint8Array([1]), headers: { 'Content-Disposition': 'attachment' } }));
    const fallback = await ApiClient.request<ApiDownload>({ path: '/x' });
    expect(fallback.fileName).toBe('documento.docx');
  });

  it('sigue leyendo JSON cuando no es un adjunto y traduce errores', async () => {
    FakeFetch.install(() => ({ status: 200, body: { ok: true } }));
    await expect(ApiClient.request<{ ok: boolean }>({ path: '/x' })).resolves.toEqual({ ok: true });

    FakeFetch.install(() => ({ status: 403, body: { message: 'Permiso insuficiente' } }));
    await expect(ApiClient.request({ path: '/x' })).rejects.toBeInstanceOf(ApiError);
  });
});

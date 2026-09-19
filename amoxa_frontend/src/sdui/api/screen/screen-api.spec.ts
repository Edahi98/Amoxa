import { SduiFixtures } from '@sdui-testing/sdui-fixtures';
import { FakeFetch } from '@sdui-testing-fake/fake-fetch';
import { ScreenApi } from '@sdui-api-screen/screen-api';
import { ScreenLoadError } from '@sdui-api-screen/screen-load-error';
import { ScreenCache } from '@sdui-offline/screen-cache';
import { MemoryStorage } from '@sdui-offline-storage/memory-storage';
import { ApiClient } from '@utils-api/ApiClient.js';
import { ApiError } from '@utils-api/ApiError.js';
import { SessionExpiredBus } from '@utils-api/SessionExpiredBus.js';

async function failure(promise: Promise<unknown>): Promise<ScreenLoadError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ScreenLoadError) return error;
  }
  throw new Error('Se esperaba un ScreenLoadError');
}

describe('ScreenApi', () => {
  afterEach(() => FakeFetch.restore());

  it('pide la pantalla con token y entidad, y devuelve el ScreenModel', async () => {
    const fake = FakeFetch.install(() => ({ status: 200, body: SduiFixtures.rawScreen() }));

    const screen = await new ScreenApi().load({ screenId: 'programa.editar', token: 'abc', entityId: 'p1', entityType: 'PROGRAMA' });

    expect(fake.calls[0].url).toBe('http://localhost:3000/sdui/screens/programa.editar?entityId=p1&entityType=PROGRAMA');
    expect(fake.calls[0].headers['Authorization']).toBe('Bearer abc');
    expect(screen.screenId).toBe('programa.editar');
  });

  it('un 401 notifica el logout y devuelve un error unauthorized', async () => {
    FakeFetch.install(() => ({ status: 401, body: { message: 'Unauthorized' } }));
    const listener = vi.fn();
    const unsubscribe = SessionExpiredBus.subscribe(listener);

    const error = await failure(new ScreenApi().load({ screenId: 'inicio', token: 'x' }));
    unsubscribe();

    expect(error.kind).toBe('unauthorized');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('traduce 403, 404 y 5xx a errores tipados', async () => {
    const kinds: Array<[number, string, boolean]> = [
      [403, 'forbidden', false],
      [404, 'not_found', false],
      [500, 'server', true],
    ];
    for (const [status, kind, retryable] of kinds) {
      FakeFetch.install(() => ({ status }));
      const error = await failure(new ScreenApi().load({ screenId: 'inicio', token: 'x' }));
      expect(error.kind).toBe(kind);
      expect(error.retryable).toBe(retryable);
      FakeFetch.restore();
    }
  });

  it('un fallo de red produce un error network reintentable', async () => {
    FakeFetch.install(() => new TypeError('Failed to fetch'));

    const error = await failure(new ScreenApi().load({ screenId: 'inicio', token: 'x' }));

    expect(error.kind).toBe('network');
    expect(error.retryable).toBe(true);
  });

  it('un JSON con formato inválido produce un error invalid con detalles', async () => {
    FakeFetch.install(() => ({ status: 200, body: { screen_id: 'x' } }));

    const error = await failure(new ScreenApi().load({ screenId: 'x', token: 'x' }));

    expect(error.kind).toBe('invalid');
    expect(error.details.length).toBeGreaterThan(0);
  });

  it('sin conexión usa la pantalla cacheada cuando offline.enabled y el ttl siguen vigentes', async () => {
    const cache = new ScreenCache(new MemoryStorage());
    const api = new ScreenApi(cache);
    FakeFetch.install(() => ({ status: 200, body: SduiFixtures.rawScreen() }));
    await api.load({ screenId: 'programa.editar', token: 'x', scope: 'u1' });
    FakeFetch.restore();

    FakeFetch.install(() => new TypeError('Failed to fetch'));
    const screen = await api.load({ screenId: 'programa.editar', token: 'x', scope: 'u1' });

    expect(screen.screenId).toBe('programa.editar');
  });

  it('no cachea pantallas sin offline.enabled', async () => {
    const cache = new ScreenCache(new MemoryStorage());
    const api = new ScreenApi(cache);
    const raw = SduiFixtures.rawScreen();
    (raw['context'] as { offline: { enabled: boolean } }).offline.enabled = false;
    FakeFetch.install(() => ({ status: 200, body: raw }));
    await api.load({ screenId: 'programa.editar', token: 'x', scope: 'u1' });
    FakeFetch.restore();

    FakeFetch.install(() => new TypeError('Failed to fetch'));
    const error = await failure(api.load({ screenId: 'programa.editar', token: 'x', scope: 'u1' }));

    expect(error.kind).toBe('network');
  });
});

describe('ApiClient', () => {
  afterEach(() => FakeFetch.restore());

  it('envía JSON con Bearer y devuelve el cuerpo', async () => {
    const fake = FakeFetch.install(() => ({ status: 200, body: { ok: 1 } }));

    const body = await ApiClient.request<{ ok: number }>({ method: 'POST', path: 'items', token: 't', body: { a: 1 } });

    expect(body).toEqual({ ok: 1 });
    expect(fake.calls[0]).toMatchObject({ url: 'http://localhost:3000/items', method: 'POST', body: { a: 1 } });
    expect(fake.calls[0].headers['Content-Type']).toBe('application/json');
    expect(fake.calls[0].headers['Authorization']).toBe('Bearer t');
  });

  it('un GET no envía cuerpo ni Content-Type', async () => {
    const fake = FakeFetch.install(() => ({ status: 204 }));

    const body = await ApiClient.request<undefined>({ path: '/items', query: { a: '1', b: undefined } });

    expect(body).toBeUndefined();
    expect(fake.calls[0].url).toBe('http://localhost:3000/items?a=1');
    expect(fake.calls[0].headers['Content-Type']).toBeUndefined();
  });

  it('lanza ApiError con status y mensaje del servidor', async () => {
    FakeFetch.install(() => ({ status: 400, body: { message: 'Datos no validos' } }));

    await expect(ApiClient.request({ path: '/x' })).rejects.toMatchObject({ status: 400, message: 'Datos no validos' });
    await expect(ApiClient.request({ path: '/x' })).rejects.toBeInstanceOf(ApiError);
  });

  it('un fallo de red es un ApiError con status 0', async () => {
    FakeFetch.install(() => new TypeError('Failed to fetch'));

    const error = await ApiClient.request({ path: '/x' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetworkError).toBe(true);
  });
});

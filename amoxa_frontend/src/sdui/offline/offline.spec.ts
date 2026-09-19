import { FakeFetch, type FakeRequest } from '@sdui-testing-fake/fake-fetch';
import { OfflineQueue } from '@sdui-offline-queue/offline-queue';
import { MemoryStorage } from '@sdui-offline-storage/memory-storage';
import { SyncManager, type SyncEventTarget } from '@sdui-offline/sync-manager';
import { ScreenCache } from '@sdui-offline/screen-cache';
import type { KeyValueStorage } from '@sdui-offline-storage/key-value-storage';
import type { QueuedRequest } from '@sdui-offline-queue/queued-request';
import type { ConflictPolicy } from '@sdui-model/sdui-enums';

function item(id: string, policy: ConflictPolicy = 'manual', overrides: Partial<QueuedRequest> = {}): QueuedRequest {
  return {
    id,
    screenId: 'ejecucion.checklist',
    actionId: 'guardar',
    method: 'PUT',
    endpoint: `/auditorias/${id}/respuestas`,
    payload: { respuestas: { q1: 'conforme' } },
    idempotencyKey: `key-${id}`,
    ifVersion: 3,
    conflictPolicy: policy,
    createdAt: '2026-01-01T00:00:00.000Z',
    attempts: 0,
    status: 'pending',
    ...overrides,
  };
}

class FakeTarget implements SyncEventTarget {
  public readonly listeners = new Map<string, Set<() => void>>();

  public addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? new Set()).add(listener));
  }

  public removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

describe('OfflineQueue', () => {
  it('persiste y se recupera desde el mismo storage', () => {
    const storage = new MemoryStorage();
    const queue = new OfflineQueue(storage);
    queue.enqueue(item('a'));
    queue.enqueue(item('b'));
    queue.markSynced('2026-02-02T00:00:00.000Z');

    const restored = new OfflineQueue(storage);
    expect(restored.list().map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(restored.count()).toBe(2);
    expect(restored.lastSyncAt()).toBe('2026-02-02T00:00:00.000Z');
  });

  it('actualiza, elimina y notifica a los suscriptores', () => {
    const queue = new OfflineQueue(new MemoryStorage());
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);

    queue.enqueue(item('a'));
    queue.update('a', { status: 'conflict' });
    expect(queue.count()).toBe(0);
    expect(queue.unresolved()).toBe(1);
    queue.remove('a');
    expect(queue.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    queue.enqueue(item('b'));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('ignora contenido corrupto y sigue funcionando en memoria si el storage falla', () => {
    const corrupt = new MemoryStorage();
    corrupt.setItem(OfflineQueue.STORAGE_KEY, '{no es json');
    expect(new OfflineQueue(corrupt).list()).toEqual([]);

    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('cuota');
      },
      removeItem: () => undefined,
    };
    const queue = new OfflineQueue(broken);
    queue.enqueue(item('a'));
    expect(queue.count()).toBe(1);
  });

  it('descarta entradas persistidas con forma inválida', () => {
    const storage = new MemoryStorage();
    storage.setItem(OfflineQueue.STORAGE_KEY, JSON.stringify({ items: [{ foo: 1 }, item('ok')] }));
    expect(new OfflineQueue(storage).list().map((entry) => entry.id)).toEqual(['ok']);
  });
});

describe('SyncManager', () => {
  afterEach(() => FakeFetch.restore());

  function build(online = true): { queue: OfflineQueue; manager: SyncManager; state: { online: boolean } } {
    const state = { online };
    const queue = new OfflineQueue(new MemoryStorage());
    const manager = new SyncManager(queue, {
      getToken: () => 'tok',
      isOnline: () => state.online,
      now: () => new Date('2026-03-03T10:00:00.000Z'),
    });
    return { queue, manager, state };
  }

  it('el snapshot refleja offline, pendiente, error y sincronizado', () => {
    const { queue, manager, state } = build(false);
    expect(manager.getSnapshot().state).toBe('offline');

    state.online = true;
    manager.refresh();
    expect(manager.getSnapshot().state).toBe('synced');

    queue.enqueue(item('a'));
    expect(manager.getSnapshot()).toMatchObject({ state: 'pending', pending: 1 });

    queue.update('a', { status: 'conflict' });
    expect(manager.getSnapshot()).toMatchObject({ state: 'error', pending: 0, unresolved: 1 });
  });

  it('flush envía en orden con los headers guardados, vacía la cola y registra la última sincronización', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { queue, manager } = build();
    queue.enqueue(item('a'));
    queue.enqueue(item('b'));

    const result = await manager.flush();

    expect(result).toMatchObject({ synced: 2, remaining: 0, offline: false });
    expect(fake.calls.map((call) => call.url)).toEqual([
      'http://localhost:3000/auditorias/a/respuestas',
      'http://localhost:3000/auditorias/b/respuestas',
    ]);
    expect(fake.calls[0].headers['Idempotency-Key']).toBe('key-a');
    expect(fake.calls[0].headers['If-Version']).toBe('3');
    expect(fake.calls[0].headers['Authorization']).toBe('Bearer tok');
    expect(queue.count()).toBe(0);
    expect(manager.getSnapshot()).toMatchObject({ state: 'synced', lastSyncAt: '2026-03-03T10:00:00.000Z' });
  });

  it('sin conexión no envía nada y conserva la cola', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { queue, manager } = build(false);
    queue.enqueue(item('a'));

    const result = await manager.flush();

    expect(result).toMatchObject({ offline: true, remaining: 1 });
    expect(fake.calls).toHaveLength(0);
  });

  it('un fallo de red detiene el envío y conserva los pendientes', async () => {
    FakeFetch.install(() => new TypeError('Failed to fetch'));
    const { queue, manager } = build();
    queue.enqueue(item('a'));
    queue.enqueue(item('b'));

    const result = await manager.flush();

    expect(result).toMatchObject({ synced: 0, remaining: 2, offline: true });
    expect(queue.count()).toBe(2);
  });

  it('un 5xx conserva el elemento pendiente y detiene el envío', async () => {
    const fake = FakeFetch.install(() => ({ status: 503 }));
    const { queue, manager } = build();
    queue.enqueue(item('a'));
    queue.enqueue(item('b'));

    const result = await manager.flush();

    expect(fake.calls).toHaveLength(1);
    expect(result).toMatchObject({ failed: 1, remaining: 2 });
    expect(queue.list()[0]).toMatchObject({ status: 'pending', attempts: 1 });
  });

  it('un 4xx marca el elemento como fallido y continúa con los demás', async () => {
    const fake = FakeFetch.install((request) => ({ status: request.url.includes('/a/') ? 422 : 200 }));
    const { queue, manager } = build();
    queue.enqueue(item('a'));
    queue.enqueue(item('b'));

    const result = await manager.flush();

    expect(fake.calls).toHaveLength(2);
    expect(result).toMatchObject({ synced: 1, failed: 1 });
    expect(queue.list()).toHaveLength(1);
    expect(queue.list()[0]).toMatchObject({ id: 'a', status: 'failed' });
  });

  it('409 con server_wins descarta el cambio local', async () => {
    FakeFetch.install(() => ({ status: 409 }));
    const { queue, manager } = build();
    queue.enqueue(item('a', 'server_wins'));

    const result = await manager.flush();

    expect(result).toMatchObject({ discarded: 1, synced: 0 });
    expect(queue.list()).toEqual([]);
  });

  it('409 con last_write_wins reintenta sin If-Version', async () => {
    const fake = FakeFetch.install((request: FakeRequest) => ({ status: request.headers['If-Version'] ? 409 : 200 }));
    const { queue, manager } = build();
    queue.enqueue(item('a', 'last_write_wins'));

    const result = await manager.flush();

    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[0].headers['If-Version']).toBe('3');
    expect(fake.calls[1].headers['If-Version']).toBeUndefined();
    expect(result).toMatchObject({ synced: 1, conflicts: 0 });
    expect(queue.list()).toEqual([]);
  });

  it('409 con manual deja el elemento marcado en conflicto y no lo reintenta solo', async () => {
    const fake = FakeFetch.install(() => ({ status: 409 }));
    const { queue, manager } = build();
    queue.enqueue(item('a', 'manual'));

    const result = await manager.flush();
    await manager.flush();

    expect(result).toMatchObject({ conflicts: 1 });
    expect(queue.list()[0]).toMatchObject({ status: 'conflict' });
    expect(fake.calls).toHaveLength(1);
    expect(manager.getSnapshot().state).toBe('error');
  });

  it('retry con overwrite reenvía sin If-Version un elemento en conflicto', async () => {
    const fake = FakeFetch.install((request) => ({ status: request.headers['If-Version'] ? 409 : 200 }));
    const { queue, manager } = build();
    queue.enqueue(item('a', 'manual'));
    await manager.flush();

    manager.retry('a', true);
    await manager.flush();

    expect(fake.calls[fake.calls.length - 1].headers['If-Version']).toBeUndefined();
    expect(queue.list()).toEqual([]);
  });

  it('flush concurrente comparte la misma ejecución', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { queue, manager } = build();
    queue.enqueue(item('a'));

    await Promise.all([manager.flush(), manager.flush()]);

    expect(fake.calls).toHaveLength(1);
  });

  it('el evento online dispara el flush y offline actualiza el estado', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { queue, manager, state } = build(false);
    queue.enqueue(item('a'));
    const target = new FakeTarget();
    const detach = manager.attach(target);

    state.online = true;
    target.emit('online');
    await manager.flush();
    expect(fake.calls).toHaveLength(1);

    state.online = false;
    target.emit('offline');
    expect(manager.getSnapshot().state).toBe('offline');

    detach();
    expect(target.listeners.get('online')?.size).toBe(0);
  });

  it('notifica a los suscriptores solo cuando cambia el snapshot', () => {
    const { queue, manager } = build();
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.refresh();
    expect(listener).not.toHaveBeenCalled();

    queue.enqueue(item('a'));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ScreenCache', () => {
  it('devuelve la pantalla vigente y expira después del ttl', () => {
    let now = 1_000;
    const storage = new MemoryStorage();
    const cache = new ScreenCache(storage, () => now);
    const key = ScreenCache.key('u1', 'inicio');

    cache.write(key, { screen_id: 'inicio' }, 60);
    expect(cache.read(key)).toEqual({ screen_id: 'inicio' });

    now += 61_000;
    expect(cache.read(key)).toBeUndefined();
    expect(storage.getItem(key)).toBeNull();
  });

  it('clear elimina todo lo cacheado', () => {
    const storage = new MemoryStorage();
    const cache = new ScreenCache(storage);
    cache.write(ScreenCache.key('u1', 'a'), { a: 1 }, 60);
    cache.write(ScreenCache.key('u1', 'b'), { b: 1 }, 60);

    cache.clear();

    expect(cache.read(ScreenCache.key('u1', 'a'))).toBeUndefined();
    expect(cache.read(ScreenCache.key('u1', 'b'))).toBeUndefined();
  });
});

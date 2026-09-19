import { SduiFixtures } from '@sdui-testing/sdui-fixtures';
import { FakeEnvironment } from '@sdui-testing-fake/fake-environment';
import { FakeFetch } from '@sdui-testing-fake/fake-fetch';
import { ActionExecutor } from '@sdui-actions/action-executor';
import { OfflineQueue } from '@sdui-offline-queue/offline-queue';
import { MemoryStorage } from '@sdui-offline-storage/memory-storage';
import { SessionExpiredBus } from '@utils-api/SessionExpiredBus.js';
import type { ScreenModel } from '@sdui-model-screen/screen.model';

interface Setup {
  screen: ScreenModel;
  env: FakeEnvironment;
  queue: OfflineQueue;
  executor: ActionExecutor;
}

function setup(mutate?: (raw: Record<string, unknown>) => void, data?: Record<string, unknown>): Setup {
  const screen = SduiFixtures.screen(mutate);
  const env = new FakeEnvironment(screen.context);
  if (data) env.data = { ...env.data, ...data };
  const queue = new OfflineQueue(new MemoryStorage());
  return { screen, env, queue, executor: new ActionExecutor({ screen, environment: env, queue }) };
}

function withPeriodo(): Record<string, unknown> {
  return { programa: { nombre: 'Programa 2026', periodo: '2026' }, avance: 80 };
}

describe('ActionExecutor', () => {
  afterEach(() => FakeFetch.restore());

  it('navigate resuelve placeholders contra el contexto', async () => {
    const { env, executor } = setup();
    const outcome = await executor.execute('ir_inicio', { itemId: 'x' });

    expect(outcome.status).toBe('ok');
    expect(env.navigations).toEqual([{ screenId: 'inicio', params: { entityId: 'p1', entityType: 'PROGRAMA', itemId: 'x' } }]);
  });

  it('submit correcto envía headers, cuerpo y encadena on_success', async () => {
    const fake = FakeFetch.install(() => ({ status: 200, body: { ok: true } }));
    const { env, executor } = setup(undefined, withPeriodo());

    const outcome = await executor.execute('guardar');

    expect(outcome.status).toBe('ok');
    const call = fake.calls[0];
    expect(call.method).toBe('PUT');
    expect(call.url).toBe('http://localhost:3000/programas/p1');
    expect(call.headers['Authorization']).toBe('Bearer token-123');
    expect(call.headers['Idempotency-Key']).toBe('prog-p1-guardar');
    expect(call.headers['If-Version']).toBe('4');
    expect(call.body).toEqual(env.data);
    expect(env.toasts).toEqual([{ message: 'Listo, Ana', tone: 'success' }]);
  });

  it('genera un uuid como Idempotency-Key cuando la acción no lo declara', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { executor } = setup((raw) => {
      delete (raw['actions'] as Record<string, Record<string, unknown>>)['guardar']['idempotency_key'];
    }, withPeriodo());

    await executor.execute('guardar');

    expect(fake.calls[0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('usa el payload declarado con placeholders en lugar de todo context.data', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { executor } = setup((raw) => {
      (raw['actions'] as Record<string, Record<string, unknown>>)['guardar']['payload'] = { periodo: '{data.programa.periodo}', id: '{entity.id}' };
    }, withPeriodo());

    await executor.execute('guardar');

    expect(fake.calls[0].body).toEqual({ periodo: '2026', id: 'p1' });
  });

  it('requires_rules con severidad block impide la petición', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { env, executor } = setup();

    const outcome = await executor.execute('guardar');

    expect(outcome.status).toBe('blocked');
    expect(fake.calls).toHaveLength(0);
    expect(env.blocked).toBe(1);
    expect(env.toasts[0].message).toBe('Indique el periodo del programa.');
  });

  it('requires_rules solo bloquea cuando la regla es block', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { executor } = setup((raw) => {
      raw['state_machine'] = { transitions: [] };
      (raw['actions'] as Record<string, Record<string, unknown>>)['guardar']['requires_rules'] = ['AVANCE_BAJO'];
    });

    const outcome = await executor.execute('guardar');

    expect(outcome.status).toBe('ok');
    expect(fake.calls).toHaveLength(1);
  });

  it('StateMachineGuard impide la acción cuando el rol no está permitido', async () => {
    const { env, executor } = setup(undefined, withPeriodo());

    const outcome = await executor.execute('confirmar');

    expect(outcome.status).toBe('blocked');
    expect(env.confirmations).toEqual([]);
    expect(env.toasts[0].tone).toBe('warning');
  });

  it('un error HTTP ejecuta on_error y no muestra el toast genérico', async () => {
    FakeFetch.install(() => ({ status: 500, body: { message: 'boom' } }));
    const { env, executor } = setup(undefined, withPeriodo());

    const outcome = await executor.execute('guardar');

    expect(outcome.status).toBe('error');
    expect(env.toasts).toEqual([{ message: 'No se pudo guardar', tone: 'danger' }]);
  });

  it('un error HTTP sin on_error muestra un toast de error con el mensaje del servidor', async () => {
    FakeFetch.install(() => ({ status: 422, body: { message: 'Periodo inválido' } }));
    const { env, executor } = setup(undefined, withPeriodo());

    const outcome = await executor.execute('aplicar_filtros');

    expect(outcome.status).toBe('error');
    expect(env.toasts).toEqual([{ message: 'Periodo inválido', tone: 'danger' }]);
  });

  it('un 5xx no expone el detalle del servidor', async () => {
    FakeFetch.install(() => ({ status: 503, body: { message: 'stack interno' } }));
    const { env, executor } = setup(undefined, withPeriodo());

    await executor.execute('aplicar_filtros');

    expect(env.toasts[0].message).not.toContain('stack');
  });

  it('un 409 en línea informa el conflicto', async () => {
    FakeFetch.install(() => ({ status: 409 }));
    const { env, executor } = setup(undefined, withPeriodo());

    await executor.execute('aplicar_filtros');

    expect(env.toasts[0].message).toContain('cambió en el servidor');
  });

  it('call_api GET resuelve el query, no envía cuerpo y aplica la respuesta a context.data', async () => {
    const fake = FakeFetch.install(() => ({ status: 200, body: { indicadores: { total: 99 } } }));
    const { env, executor } = setup(undefined, withPeriodo());

    await executor.execute('aplicar_filtros');

    expect(fake.calls[0].url).toBe('http://localhost:3000/programas/indicadores?periodo=2026');
    expect(fake.calls[0].body).toBeUndefined();
    expect(fake.calls[0].headers['Idempotency-Key']).toBeUndefined();
    expect((env.data['indicadores'] as { total: number }).total).toBe(99);
  });

  it('call_api GET con adjunto descarga el archivo, avisa y no vuelca datos en context.data', async () => {
    FakeFetch.install(() => ({
      status: 200,
      bytes: new Uint8Array([80, 75, 3, 4]),
      headers: { 'Content-Disposition': 'attachment; filename="Reporte-2026.docx"' },
    }));
    const { env, executor } = setup(undefined, withPeriodo());

    const outcome = await executor.execute('aplicar_filtros');

    expect(outcome.status).toBe('ok');
    expect(env.downloads).toHaveLength(1);
    expect(env.downloads[0].fileName).toBe('Reporte-2026.docx');
    expect(env.downloads[0].blob.size).toBe(4);
    expect(env.toasts).toEqual([{ message: 'Documento descargado.', tone: 'success' }]);
    expect(env.data['indicadores']).toEqual({ total: 12 });
  });

  it('placeholders faltantes en la ruta bloquean la petición', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { env, executor } = setup((raw) => {
      (raw['actions'] as Record<string, Record<string, unknown>>)['aplicar_filtros']['endpoint'] = '/programas/{data.programa.id}/indicadores';
    });

    const outcome = await executor.execute('aplicar_filtros');

    expect(outcome.status).toBe('blocked');
    expect(fake.calls).toHaveLength(0);
    expect(env.blocked).toBe(1);
  });

  it('confirm continúa con on_success solo si el usuario acepta', async () => {
    const accepted = setup((raw) => {
      (raw['context'] as { user: { rol: string } }).user.rol = 'direccion';
    });
    await accepted.executor.execute('confirmar');
    expect(accepted.env.confirmations).toEqual(['¿Cerrar el programa?']);
    expect(accepted.env.toasts).toEqual([{ message: 'Listo, Ana', tone: 'success' }]);

    const declined = setup((raw) => {
      (raw['context'] as { user: { rol: string } }).user.rol = 'direccion';
    });
    declined.env.confirmAnswer = false;
    const outcome = await declined.executor.execute('confirmar');
    expect(outcome.status).toBe('cancelled');
    expect(declined.env.toasts).toEqual([]);
  });

  it('confirm_text en una acción de red pide confirmación antes de enviar', async () => {
    const fake = FakeFetch.install(() => ({ status: 200 }));
    const { env, executor } = setup((raw) => {
      (raw['actions'] as Record<string, Record<string, unknown>>)['aplicar_filtros']['confirm_text'] = '¿Actualizar?';
    }, withPeriodo());
    env.confirmAnswer = false;

    const outcome = await executor.execute('aplicar_filtros');

    expect(outcome.status).toBe('cancelled');
    expect(fake.calls).toHaveLength(0);
  });

  it('toast muestra el mensaje con placeholders y traduce el tono error', async () => {
    const { env, executor } = setup();
    await executor.execute('avisar');
    await executor.execute('avisar_error');
    expect(env.toasts).toEqual([
      { message: 'Listo, Ana', tone: 'success' },
      { message: 'No se pudo guardar', tone: 'danger' },
    ]);
  });

  it('logout, refresh, close y open_modal llaman al entorno', async () => {
    const { env, executor } = setup((raw) => {
      (raw['actions'] as Record<string, unknown>)['salir'] = { type: 'logout' };
    });

    await executor.execute('salir');
    await executor.execute('refrescar');
    await executor.execute('cerrar');
    await executor.execute('abrir_detalle');

    expect(env.logouts).toBe(1);
    expect(env.reloads).toBe(1);
    expect(env.closes).toBe(1);
    expect(env.modals).toEqual([{ screenId: 'programa.lista', params: { entityId: 'p1' } }]);
  });

  it('sync_now sincroniza y informa el resultado', async () => {
    const { env, executor } = setup();
    env.syncResult = { synced: 2, discarded: 0, conflicts: 0, failed: 0, remaining: 0, offline: false };

    expect((await executor.execute('sincronizar')).status).toBe('ok');
    expect(env.syncs).toBe(1);
    expect(env.toasts[0]).toEqual({ message: 'Se sincronizaron 2 cambios.', tone: 'success' });

    env.syncResult = { synced: 0, discarded: 0, conflicts: 1, failed: 0, remaining: 0, offline: false };
    expect((await executor.execute('sincronizar')).status).toBe('error');

    env.syncResult = { synced: 0, discarded: 0, conflicts: 0, failed: 0, remaining: 1, offline: true };
    await executor.execute('sincronizar');
    expect(env.toasts[env.toasts.length - 1].tone).toBe('warning');
  });

  it('capture_media delega en el entorno y avisa si no hay control', async () => {
    const { env, executor } = setup();
    expect((await executor.execute('capturar')).status).toBe('ok');
    expect(env.captures).toEqual([{ componentId: 'evidencia_q1' }]);

    env.captureResult = false;
    expect((await executor.execute('capturar')).status).toBe('error');
    expect(env.toasts).toHaveLength(1);
  });

  it('una acción desconocida no rompe', async () => {
    const { executor } = setup();
    expect((await executor.execute('inexistente')).status).toBe('unknown');
  });

  it('una cadena cíclica de acciones termina', async () => {
    const { env, executor } = setup((raw) => {
      (raw['actions'] as Record<string, unknown>)['ciclo'] = { type: 'confirm', confirm_text: '¿Otra vez?', on_success: 'ciclo' };
      delete raw['state_machine'];
    });

    await executor.execute('ciclo');

    expect(env.confirmations.length).toBeGreaterThan(1);
    expect(env.confirmations.length).toBeLessThan(20);
  });

  it('un 401 notifica el cierre de sesión', async () => {
    FakeFetch.install(() => ({ status: 401 }));
    const listener = vi.fn();
    const unsubscribe = SessionExpiredBus.subscribe(listener);
    const { env, executor } = setup(undefined, withPeriodo());

    const outcome = await executor.execute('aplicar_filtros');
    unsubscribe();

    expect(outcome.status).toBe('error');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(env.toasts).toEqual([]);
  });

  describe('sin conexión', () => {
    it('encola submit en pantallas con offline.enabled e informa el estado', async () => {
      const fake = FakeFetch.install(() => ({ status: 200 }));
      const { env, queue, executor } = setup(undefined, withPeriodo());
      env.online = false;

      const outcome = await executor.execute('guardar');

      expect(outcome.status).toBe('queued');
      expect(fake.calls).toHaveLength(0);
      const [item] = queue.pending();
      expect(item.method).toBe('PUT');
      expect(item.endpoint).toBe('/programas/p1');
      expect(item.idempotencyKey).toBe('prog-p1-guardar');
      expect(item.ifVersion).toBe(4);
      expect(item.conflictPolicy).toBe('manual');
      expect(item.screenId).toBe('programa.editar');
      expect(env.toasts[0].message).toContain('sin conexión');
      expect(env.toasts[0].tone).toBe('warning');
    });

    it('con optimistic continúa con on_success tras encolar', async () => {
      FakeFetch.install(() => ({ status: 200 }));
      const { env, executor } = setup(undefined, withPeriodo());
      env.online = false;

      await executor.execute('guardar');

      expect(env.toasts.map((toast) => toast.message)).toContain('Listo, Ana');
    });

    it('un fallo de red en línea también encola', async () => {
      FakeFetch.install(() => new TypeError('Failed to fetch'));
      const { queue, executor } = setup(undefined, withPeriodo());

      const outcome = await executor.execute('guardar');

      expect(outcome.status).toBe('queued');
      expect(queue.count()).toBe(1);
    });

    it('sin offline.enabled falla y no encola', async () => {
      FakeFetch.install(() => ({ status: 200 }));
      const { env, queue, executor } = setup((raw) => {
        (raw['context'] as { offline: { enabled: boolean } }).offline.enabled = false;
      }, withPeriodo());
      env.online = false;

      const outcome = await executor.execute('guardar');

      expect(outcome.status).toBe('error');
      expect(queue.count()).toBe(0);
    });

    it('las lecturas GET no se encolan', async () => {
      FakeFetch.install(() => ({ status: 200 }));
      const { env, queue, executor } = setup(undefined, withPeriodo());
      env.online = false;

      const outcome = await executor.execute('aplicar_filtros');

      expect(outcome.status).toBe('error');
      expect(queue.count()).toBe(0);
    });
  });
});

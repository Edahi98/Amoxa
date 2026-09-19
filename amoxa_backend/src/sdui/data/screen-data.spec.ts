import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import { ScreenDataService } from '@sdui-data/screen-data.service.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { FakeModuleRef } from '@testing-fakes/fake-module-ref.js';
import { SampleDataProvider } from '@testing/sample-data-provider.js';

const REQUEST: ScreenDataRequest = {
  screenId: 'programa.lista',
  user: { sub: 'u1', organizacionId: 'o1', email: 'a@b.c', rol: 'admin', issuedAt: '2026-01-01T00:00:00.000Z' },
  role: 'direccion',
};

describe('ScreenDataService', () => {
  it('registra el proveedor por pantalla con el decorador', () => {
    expect(ScreenDataRegistry.providerFor('programa.lista')).toBe(SampleDataProvider);
    expect(ScreenDataRegistry.providerFor('programa.editar')).toBe(SampleDataProvider);
  });

  it('resuelve el proveedor por ModuleRef y devuelve sus datos', async () => {
    const service = new ScreenDataService(new FakeModuleRef([new SampleDataProvider()]).asModuleRef());

    const result: ScreenData = await service.load(REQUEST);

    expect(result.data).toEqual({ pantalla: 'programa.lista' });
  });

  it('devuelve un objeto vacío cuando la pantalla no tiene proveedor', async () => {
    const service = new ScreenDataService(new FakeModuleRef([]).asModuleRef());

    await expect(service.load({ ...REQUEST, screenId: 'inicio' })).resolves.toEqual({});
  });

  it('el proveedor de ejemplo es un ScreenDataProvider', () => {
    expect(new SampleDataProvider()).toBeInstanceOf(ScreenDataProvider);
  });
});

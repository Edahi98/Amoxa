import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '@auth-guards/jwt-auth.guard.js';
import { RoleExistsGuard } from '@auth-guards-authorization/role-exists.guard.js';
import { ScreenAccessGuard } from '@sdui-guards/screen-access.guard.js';
import { SduiController } from '@sdui/sdui.controller.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { FakeScreenDataService } from '@testing-fakes/fake-screen-data-service.js';
import '@screens/index.js';

describe('SduiController', () => {
  const data = new FakeScreenDataService();
  const controller = new SduiController(data.asService());

  it('devuelve el JSON de la pantalla adaptado al rol del token', async () => {
    const screen = await controller.getScreen('programa.editar', {}, new FakeRequest('gestor_programa').asRequest());

    expect(screen.screen_id).toBe('programa.editar');
    expect(screen.context.user).toEqual({ id: 'u-1', nombre: 'ana@amoxa.test', rol: 'gestor' });
    expect(Object.keys(screen.actions)).toContain('enviar_aprobacion');
  });

  it('incluye la entidad solicitada en el contexto', async () => {
    const screen = await controller.getScreen(
      'programa.aprobar',
      { entityId: 'p-9', entityType: 'programa' },
      new FakeRequest('admin').asRequest(),
    );

    expect(screen.context.entity).toEqual({ type: 'programa', id: 'p-9', version: 1 });
  });

  it('mezcla en el contexto los datos, la entidad y el modo offline que entrega el proveedor', async () => {
    const provider = new FakeScreenDataService({
      data: { programa: { periodo: '2026' } },
      entity: { type: 'programa', id: 'p-1', version: 4, estado: 'borrador' },
      offline: { enabled: true },
    });
    const custom = new SduiController(provider.asService());

    const screen = await custom.getScreen('programa.aprobar', { entityId: 'p-1' }, new FakeRequest('admin').asRequest());

    expect(screen.context.data).toEqual({ programa: { periodo: '2026' } });
    expect(screen.context.entity).toEqual({ type: 'programa', id: 'p-1', version: 4, estado: 'borrador' });
    expect(screen.context.offline).toEqual({ enabled: true });
    expect(provider.requests[0]).toMatchObject({ screenId: 'programa.aprobar', role: 'direccion', entityId: 'p-1' });
  });

  it('protege la ruta con los guardias de sesión, rol existente y acceso a la pantalla, en ese orden', () => {
    const guards = Reflect.getMetadata('__guards__', SduiController.prototype.getScreen);

    expect(guards).toEqual([JwtAuthGuard, RoleExistsGuard, ScreenAccessGuard]);
  });

  it('responde 404 si la pantalla no existe', async () => {
    await expect(controller.getScreen('no.existe', {}, new FakeRequest('admin').asRequest())).rejects.toThrow(NotFoundException);
  });

  it('responde 401 si la petición no trae usuario', async () => {
    await expect(controller.getScreen('inicio', {}, new FakeRequest().asRequest())).rejects.toThrow(UnauthorizedException);
  });
});

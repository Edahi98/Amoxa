import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { rol, usuario } from '@schemas/index.js';
import { RoleExistsGuard } from '@auth-guards-authorization/role-exists.guard.js';
import { FakeExecutionContext } from '@testing-fakes/fake-execution-context.js';
import { UsuariosHarness } from '@testing-usuarios/usuarios-harness.js';
import { AuthorizationSample } from '@testing/authorization-sample.js';

const handler = AuthorizationSample.prototype.libre;

describe('RoleExistsGuard', () => {
  let harness: UsuariosHarness;
  let guard: RoleExistsGuard;

  beforeAll(async () => {
    harness = await UsuariosHarness.create();
    guard = new RoleExistsGuard(harness.database.db);
  });

  afterAll(() => harness.close());

  it('permite el acceso cuando el usuario está activo y su rol existe en base de datos', async () => {
    const user = await harness.seedUser('auditor');
    const { context } = FakeExecutionContext.forUser({ sub: user.id, rol: 'auditor' }, handler, AuthorizationSample);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('relee el rol desde la base de datos y no confía en el del token', async () => {
    const user = await harness.seedUser('auditor');
    const { context, request } = FakeExecutionContext.forUser({ sub: user.id, rol: 'admin' }, handler, AuthorizationSample);

    await guard.canActivate(context);

    expect(request.user?.rol).toBe('auditor');
  });

  it('rechaza cuando el usuario fue desactivado', async () => {
    const user = await harness.seedUser('auditor', { activo: false });
    const { context } = FakeExecutionContext.forUser({ sub: user.id, rol: 'auditor' }, handler, AuthorizationSample);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza cuando el usuario ya no existe', async () => {
    const { context } = FakeExecutionContext.forUser(
      { sub: '00000000-0000-4000-8000-000000000000', rol: 'auditor' },
      handler,
      AuthorizationSample,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza cuando la petición no trae usuario', async () => {
    const { context } = FakeExecutionContext.forUser(undefined, handler, AuthorizationSample);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza cuando el rol no existe en la tabla de roles', async () => {
    const user = await harness.seedUser('gestor_programa');
    await harness.database.orm.delete(rol).where(eq(rol.clave, 'gestor'));
    const { context } = FakeExecutionContext.forUser({ sub: user.id, rol: 'gestor_programa' }, handler, AuthorizationSample);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('cambiar el rol en base de datos cambia el rol efectivo en la siguiente petición', async () => {
    const user = await harness.seedUser('lider_auditor');
    await harness.database.orm.update(usuario).set({ rol: 'auditado' }).where(eq(usuario.id, user.id));
    const { context, request } = FakeExecutionContext.forUser({ sub: user.id, rol: 'lider_auditor' }, handler, AuthorizationSample);

    await guard.canActivate(context);

    expect(request.user?.rol).toBe('auditado');
  });
});

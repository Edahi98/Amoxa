import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@auth/auth.service.js';
import { UsuariosHarness } from '@testing-usuarios/usuarios-harness.js';

describe('AuthService.login', () => {
  let harness: UsuariosHarness;
  let service: AuthService;

  beforeAll(async () => {
    harness = await UsuariosHarness.create();
    service = new AuthService(harness.database.db, harness.tokens);
  });

  afterAll(() => harness.close());

  it('entra con credenciales válidas y registra el último acceso', async () => {
    const user = await harness.seedUser('auditor');

    const result = await service.login({ email: user.email, password: UsuariosHarness.PASSWORD });

    expect(result.accessToken).toEqual(expect.any(String));
    expect((await harness.userRow(user.id)).ultimoAccesoEn).toBeInstanceOf(Date);
  });

  it('el superusuario y el administrador entran igual que el resto', async () => {
    const superuser = await harness.seedUser('superusuario');
    const admin = await harness.seedUser('administrador');

    await expect(service.login({ email: superuser.email, password: UsuariosHarness.PASSWORD })).resolves.toBeDefined();
    await expect(service.login({ email: admin.email, password: UsuariosHarness.PASSWORD })).resolves.toBeDefined();
  });

  it('rechaza con el mismo mensaje a un usuario inactivo, sin contraseña, con contraseña errónea o inexistente', async () => {
    const inactive = await harness.seedUser('auditor', { activo: false });
    const noPassword = await harness.seedUser('auditor', { withPassword: false });
    const active = await harness.seedUser('auditor');

    const attempts = [
      () => service.login({ email: inactive.email, password: UsuariosHarness.PASSWORD }),
      () => service.login({ email: noPassword.email, password: UsuariosHarness.PASSWORD }),
      () => service.login({ email: active.email, password: 'incorrecta' }),
      () => service.login({ email: 'nadie@amoxa.test', password: UsuariosHarness.PASSWORD }),
    ];

    for (const attempt of attempts) {
      await expect(attempt()).rejects.toThrow(UnauthorizedException);
      await expect(attempt()).rejects.toThrow('Credenciales inválidas');
    }
  });

  it('un usuario inactivo no deja último acceso', async () => {
    const inactive = await harness.seedUser('auditor', { activo: false });

    await service.login({ email: inactive.email, password: UsuariosHarness.PASSWORD }).catch(() => undefined);

    expect((await harness.userRow(inactive.id)).ultimoAccesoEn).toBeNull();
  });
});

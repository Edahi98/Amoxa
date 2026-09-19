import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { auditLog, passwordRequest } from '@schemas/index.js';
import { MeController } from '@usuarios-controllers/me.controller.js';
import { UsuariosController } from '@usuarios-controllers/usuarios.controller.js';
import { UsuariosHarness, type HarnessUser } from '@testing-usuarios/usuarios-harness.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { PasswordChangeSchema } from '@validators-usuarios/password-change.schema.js';
import { UsuarioCreateSchema } from '@validators-usuarios/usuario-create.schema.js';
import { UsuarioListQuerySchema } from '@validators-usuarios/usuario-list-query.schema.js';
import { UsuarioRoleSchema } from '@validators-usuarios/usuario-role.schema.js';
import { UsuarioUpdateSchema } from '@validators-usuarios/usuario-update.schema.js';

describe('gestor de usuarios', () => {
  let harness: UsuariosHarness;
  let superuser: HarnessUser;

  beforeAll(async () => {
    harness = await UsuariosHarness.create();
    superuser = await harness.seedUser('superusuario');
  });

  afterAll(() => harness.close());

  const actor = () => harness.payload(superuser);
  const logOf = (targetId: string) => harness.database.orm.select().from(auditLog).where(eq(auditLog.targetId, targetId));

  describe('protección de rutas', () => {
    it('todas las rutas de usuarios exigen sesión, rol existente y rol superusuario', () => {
      for (const report of RouteGuardInspector.routes(UsuariosController)) {
        expect(report.guards).toEqual(['JwtAuthGuard', 'RoleExistsGuard', 'RolesGuard']);
      }
      expect(RouteGuardInspector.routes(UsuariosController)).toHaveLength(7);
      expect(Reflect.getMetadata('auth:roles', UsuariosController)).toEqual(['superusuario']);
    });

    it('/me exige sesión válida y ningún rol en particular', () => {
      expect(RouteGuardInspector.unprotected(MeController)).toEqual([]);
      expect(Reflect.getMetadata('auth:roles', MeController)).toBeUndefined();
    });
  });

  describe('validación', () => {
    it('el rol asignable no acepta superusuario', () => {
      expect(UsuarioRoleSchema.safeParse({ rol: 'superusuario' }).success).toBe(false);
      expect(UsuarioRoleSchema.safeParse({ rol: 'administrador' }).success).toBe(true);
      expect(UsuarioCreateSchema.safeParse({ nombre: 'Ana', email: 'ana@amoxa.test', rol: 'superusuario' }).success).toBe(false);
    });

    it('los booleanos del query llegan como texto y se convierten', () => {
      expect(UsuarioListQuerySchema.parse({ activo: 'true' }).activo).toBe(true);
      expect(UsuarioListQuerySchema.parse({ activo: 'false' }).activo).toBe(false);
      expect(UsuarioListQuerySchema.safeParse({ activo: '0' }).success).toBe(false);
      expect(UsuarioListQuerySchema.safeParse({ activo: 'yes' }).success).toBe(false);
    });

    it('la paginación tiene valores por defecto y un máximo de 100', () => {
      expect(UsuarioListQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
      expect(UsuarioListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
      expect(UsuarioListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
      expect(UsuarioListQuerySchema.parse({ limit: '100' }).limit).toBe(100);
    });

    it('rechaza búsquedas con inyección y campos desconocidos', () => {
      expect(UsuarioListQuerySchema.safeParse({ search: "' OR 1=1 --" }).success).toBe(false);
      expect(UsuarioListQuerySchema.safeParse({ extra: 'x' }).success).toBe(false);
    });

    it('la edición solo admite nombre y email, nunca rol ni estado', () => {
      expect(UsuarioUpdateSchema.safeParse({ nombre: 'Ana' }).success).toBe(true);
      expect(UsuarioUpdateSchema.safeParse({}).success).toBe(false);
      expect(UsuarioUpdateSchema.safeParse({ nombre: 'Ana', rol: 'auditor' }).success).toBe(false);
      expect(UsuarioUpdateSchema.safeParse({ nombre: 'Ana', activo: true }).success).toBe(false);
    });

    it('el cambio de contraseña exige 12 caracteres en la nueva', () => {
      expect(PasswordChangeSchema.safeParse({ currentPassword: 'x', newPassword: 'corta' }).success).toBe(false);
      expect(PasswordChangeSchema.safeParse({ currentPassword: 'x', newPassword: 'nueva-contrasena-1' }).success).toBe(true);
    });
  });

  describe('listado', () => {
    beforeAll(async () => {
      await harness.seedUser('auditor', { email: 'buscar-ana@amoxa.test' });
      await harness.seedUser('auditor', { email: 'buscar-beto@amoxa.test', activo: false });
      await harness.seedUser('gestor_programa', { email: 'buscar-carla@amoxa.test' });
    });

    it('pagina y devuelve el total', async () => {
      const page = await harness.query.list({ page: 1, limit: 2 });

      expect(page.items).toHaveLength(2);
      expect(page.total).toBeGreaterThanOrEqual(4);
      expect(page).toMatchObject({ page: 1, limit: 2 });
    });

    it('filtra por rol de la definición de roles', async () => {
      const page = await harness.query.list({ page: 1, limit: 50, rol: 'gestor' });

      expect(page.items.every((item) => item.rol === 'gestor')).toBe(true);
      expect(page.items.map((item) => item.email)).toContain('buscar-carla@amoxa.test');
    });

    it('filtra por estado', async () => {
      const inactive = await harness.query.list({ page: 1, limit: 50, activo: false });

      expect(inactive.items.every((item) => !item.activo)).toBe(true);
      expect(inactive.items.map((item) => item.email)).toContain('buscar-beto@amoxa.test');
    });

    it('busca por nombre o correo sin distinguir mayúsculas', async () => {
      const found = await harness.query.list({ page: 1, limit: 50, search: 'BUSCAR-ANA' });

      expect(found.items.map((item) => item.email)).toEqual(['buscar-ana@amoxa.test']);
    });

    it('trata los comodines de la búsqueda como texto literal', async () => {
      const found = await harness.query.list({ page: 1, limit: 50, search: '%' });

      expect(found.items).toHaveLength(0);
    });

    it('nunca expone el hash de la contraseña', async () => {
      const page = await harness.query.list({ page: 1, limit: 5 });

      expect(JSON.stringify(page)).not.toContain('passwordHash');
      expect(JSON.stringify(page)).not.toContain('$2');
    });

    it('devuelve un usuario por id y 404 si no existe', async () => {
      const user = await harness.seedUser('auditor');

      expect(await harness.query.get(user.id)).toMatchObject({ id: user.id, rol: 'auditor', passwordDefinida: true });
      await expect(harness.query.get('00000000-0000-4000-8000-000000000000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('alta con invitación', () => {
    it('crea el usuario inactivo, sin contraseña, con una invitación aprobada de 48 horas', async () => {
      const created = await harness.admin.create({ nombre: 'Persona Nueva', email: 'persona.nueva@amoxa.test', rol: 'gestor' }, actor(), '7.7.7.7');

      expect(created.usuario).toMatchObject({ activo: false, passwordDefinida: false, rol: 'gestor' });
      const row = await harness.userRow(created.usuario.id);
      expect(row).toMatchObject({ passwordHash: null, activo: false, rol: 'gestor_programa' });
      const [request] = await harness.database.orm.select().from(passwordRequest).where(eq(passwordRequest.usuarioId, created.usuario.id));
      expect(request).toMatchObject({ type: 'invite', status: 'approved', handledBy: superuser.id });
      const hours = (created.invitacion.expiresAt.getTime() - Date.now()) / 3_600_000;
      expect(hours).toBeGreaterThan(47.9);
      expect(hours).toBeLessThanOrEqual(48);
      expect(request.tokenHash).not.toContain(UsuariosHarness.tokenFromUrl(created.invitacion.url));
    });

    it('permite crear administradores, pero nunca superusuarios', async () => {
      const admin = await harness.admin.create({ nombre: 'Admin Nuevo', email: 'admin.nuevo@amoxa.test', rol: 'administrador' }, actor(), null);

      expect(admin.usuario.rol).toBe('administrador');
      await expect(
        harness.admin.create({ nombre: 'X', email: 'x@amoxa.test', rol: 'superusuario' as never }, actor(), null),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rechaza correos repetidos y organizaciones inexistentes', async () => {
      await expect(
        harness.admin.create({ nombre: 'Duplicado', email: superuser.email, rol: 'auditor' }, actor(), null),
      ).rejects.toThrow(ConflictException);
      await expect(
        harness.admin.create(
          { nombre: 'Sin org', email: 'sin.org@amoxa.test', rol: 'auditor', organizacionId: '00000000-0000-4000-8000-000000000000' },
          actor(),
          null,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('el invitado completa la invitación y puede entrar con su contraseña', async () => {
      const created = await harness.admin.create({ nombre: 'Invitada', email: 'invitada@amoxa.test', rol: 'auditor' }, actor(), null);

      await harness.reset.complete(UsuariosHarness.tokenFromUrl(created.invitacion.url), 'contrasena-definitiva-1', null);

      expect(await harness.userRow(created.usuario.id)).toMatchObject({ activo: true });
    });

    it('registra quién creó a quién y cuándo', async () => {
      const created = await harness.admin.create({ nombre: 'Auditada', email: 'auditada.log@amoxa.test', rol: 'auditor' }, actor(), '8.8.8.8');

      const [entry] = await logOf(created.usuario.id);
      expect(entry).toMatchObject({ action: 'user.created', actorId: superuser.id, ip: '8.8.8.8' });
      expect(entry.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('reinvitación', () => {
    it('regenera la invitación e invalida la anterior', async () => {
      const created = await harness.admin.create({ nombre: 'Perdida', email: 'perdida@amoxa.test', rol: 'auditor' }, actor(), null);

      const again = await harness.admin.invite(created.usuario.id, actor(), null);

      expect(again.invitacion.url).not.toBe(created.invitacion.url);
      await expect(harness.reset.complete(UsuariosHarness.tokenFromUrl(created.invitacion.url), 'contrasena-definitiva-1', null)).rejects.toThrow(BadRequestException);
      await expect(harness.reset.complete(UsuariosHarness.tokenFromUrl(again.invitacion.url), 'contrasena-definitiva-1', null)).resolves.toBeUndefined();
    });

    it('solo aplica a usuarios que aún no tienen contraseña', async () => {
      const withPassword = await harness.seedUser('auditor');

      await expect(harness.admin.invite(withPassword.id, actor(), null)).rejects.toThrow(ConflictException);
    });

    it('nunca genera invitaciones para el superusuario', async () => {
      await expect(harness.admin.invite(superuser.id, actor(), null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('edición de datos básicos', () => {
    it('actualiza nombre y correo y lo registra en la bitácora', async () => {
      const user = await harness.seedUser('auditor');

      const updated = await harness.admin.update(user.id, { nombre: 'Nombre Nuevo', email: 'cambiado@amoxa.test' }, actor(), null);

      expect(updated).toMatchObject({ nombre: 'Nombre Nuevo', email: 'cambiado@amoxa.test', rol: 'auditor' });
      expect((await logOf(user.id)).map((entry) => entry.action)).toContain('user.updated');
    });

    it('rechaza un correo que ya usa otra cuenta', async () => {
      const first = await harness.seedUser('auditor');
      const second = await harness.seedUser('auditor');

      await expect(harness.admin.update(second.id, { email: first.email }, actor(), null)).rejects.toThrow(ConflictException);
    });

    it('conserva el correo propio sin marcarlo como duplicado', async () => {
      const user = await harness.seedUser('auditor');

      await expect(harness.admin.update(user.id, { email: user.email, nombre: 'Igual' }, actor(), null)).resolves.toBeDefined();
    });
  });

  describe('cambio de rol', () => {
    it('cambia el rol, revoca las sesiones del usuario y lo registra', async () => {
      const user = await harness.seedUser('auditor');
      await harness.issueToken(user);
      await harness.issueToken(user);

      const updated = await harness.admin.changeRole(user.id, 'lider', actor(), '9.9.9.9');

      expect(updated.rol).toBe('lider');
      expect(await harness.revokedTokens(user.id)).toBe(2);
      const entry = (await logOf(user.id)).find((item) => item.action === 'user.role_changed');
      expect(entry).toMatchObject({ actorId: superuser.id, metadata: { de: 'auditor', a: 'lider' }, ip: '9.9.9.9' });
    });

    it('un rol igual al actual no revoca sesiones', async () => {
      const user = await harness.seedUser('auditor');
      await harness.issueToken(user);

      await harness.admin.changeRole(user.id, 'auditor', actor(), null);

      expect(await harness.revokedTokens(user.id)).toBe(0);
    });

    it('nadie puede cambiar el rol del superusuario, ni él mismo por este endpoint', async () => {
      await expect(harness.admin.changeRole(superuser.id, 'auditor', actor(), null)).rejects.toThrow(ForbiddenException);
      expect((await harness.userRow(superuser.id)).rol).toBe('superusuario');
    });
  });

  describe('activar y desactivar', () => {
    it('desactivar revoca sesiones, rechaza solicitudes pendientes e invalida tokens aprobados', async () => {
      const user = await harness.seedUser('auditor');
      await harness.issueToken(user);
      await harness.requests.submit(user.email, null);
      const invite = await harness.issuer.issueInvite(user.id, superuser.id);

      const updated = await harness.admin.changeStatus(user.id, false, actor(), null);

      expect(updated.activo).toBe(false);
      expect(await harness.revokedTokens(user.id)).toBe(1);
      const requests = await harness.database.orm.select().from(passwordRequest).where(eq(passwordRequest.usuarioId, user.id));
      expect(requests.every((request) => request.status === 'rejected' && request.tokenHash === null)).toBe(true);
      await expect(harness.reset.complete(UsuariosHarness.tokenFromUrl(invite.url), 'contrasena-definitiva-1', null)).rejects.toThrow(BadRequestException);
    });

    it('reactivar no toca las solicitudes ni las sesiones', async () => {
      const user = await harness.seedUser('auditor', { activo: false });

      const updated = await harness.admin.changeStatus(user.id, true, actor(), null);

      expect(updated.activo).toBe(true);
      expect((await logOf(user.id)).map((entry) => entry.action)).toContain('user.status_changed');
    });

    it('el superusuario no puede desactivarse ni ser desactivado', async () => {
      await expect(harness.admin.changeStatus(superuser.id, false, actor(), null)).rejects.toThrow(ForbiddenException);
      expect((await harness.userRow(superuser.id)).activo).toBe(true);
    });

    it('no existe el borrado físico', () => {
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(harness.admin))).not.toContain('delete');
      expect(RouteGuardInspector.routes(UsuariosController).map((report) => report.route)).not.toContain('remove');
    });
  });

  describe('perfil propio', () => {
    it('lee y actualiza el perfil sin exponer rol ni estado editables', async () => {
      const user = await harness.seedUser('auditor');

      const updated = await harness.profile.update(harness.payload(user), { nombre: 'Yo Mismo' }, null);

      expect(updated.nombre).toBe('Yo Mismo');
      expect((await harness.profile.get(user.id)).rol).toBe('auditor');
    });

    it('el superusuario puede editar su propio perfil', async () => {
      const updated = await harness.profile.update(actor(), { nombre: 'Super Renombrado' }, null);

      expect(updated).toMatchObject({ nombre: 'Super Renombrado', rol: 'superusuario' });
    });

    it('rechaza un correo ajeno', async () => {
      const first = await harness.seedUser('auditor');
      const second = await harness.seedUser('auditor');

      await expect(harness.profile.update(harness.payload(second), { email: first.email }, null)).rejects.toThrow(ConflictException);
    });

    it('cambia la contraseña con la actual y revoca las demás sesiones, no la actual', async () => {
      const user = await harness.seedUser('auditor');
      const current = await harness.issueToken(user);
      await harness.issueToken(user);
      await harness.issueToken(user);

      await harness.profile.changePassword(
        harness.payload(user),
        current,
        { currentPassword: UsuariosHarness.PASSWORD, newPassword: 'contrasena-nueva-larga-1' },
        null,
      );

      expect(await harness.revokedTokens(user.id)).toBe(2);
      await expect(harness.tokens.validate(current)).resolves.toBeDefined();
    });

    it('exige la contraseña actual correcta', async () => {
      const user = await harness.seedUser('auditor');
      await harness.issueToken(user);

      await expect(
        harness.profile.changePassword(harness.payload(user), undefined, { currentPassword: 'incorrecta', newPassword: 'contrasena-nueva-larga-1' }, null),
      ).rejects.toThrow(BadRequestException);
      expect(await harness.revokedTokens(user.id)).toBe(0);
    });

    it('un usuario sin contraseña definida no puede cambiarla por aquí', async () => {
      const user = await harness.seedUser('auditor', { withPassword: false });

      await expect(
        harness.profile.changePassword(harness.payload(user), undefined, { currentPassword: 'lo-que-sea', newPassword: 'contrasena-nueva-larga-1' }, null),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

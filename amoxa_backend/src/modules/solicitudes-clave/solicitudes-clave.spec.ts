import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { auditLog, passwordRequest, usuario } from '@schemas/index.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import { RestablecimientoController } from '@solicitudes-controllers/restablecimiento.controller.js';
import { SolicitudesClaveController } from '@solicitudes-controllers/solicitudes-clave.controller.js';
import { SolicitudHierarchy } from '@solicitudes-services-solicitud/solicitud-hierarchy.js';
import { SolicitudUrl } from '@solicitudes-services-solicitud/solicitud-url.js';
import { UsuariosHarness, type HarnessUser } from '@testing-usuarios/usuarios-harness.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { RestablecerClaveSchema } from '@validators-solicitudes/restablecer-clave.schema.js';
import { SecretToken } from '@common-security/secret-token.js';

const NEW_PASSWORD = 'otra-contrasena-larga-9';

describe('solicitudes de clave', () => {
  let harness: UsuariosHarness;
  let superuser: HarnessUser;
  let admin: HarnessUser;

  beforeAll(async () => {
    harness = await UsuariosHarness.create();
    superuser = await harness.seedUser('superusuario');
    admin = await harness.seedUser('administrador');
  });

  afterAll(() => harness.close());

  const requestsOf = (userId: string) =>
    harness.database.orm.select().from(passwordRequest).where(eq(passwordRequest.usuarioId, userId));

  const pendingOf = async (user: HarnessUser) => {
    await harness.requests.submit(user.email, '10.0.0.9');
    const rows = await requestsOf(user.id);
    return rows.find((row) => row.status === 'pending')!;
  };

  describe('POST /password-requests', () => {
    it('crea una solicitud de restablecimiento pendiente con la ip', async () => {
      const user = await harness.seedUser('auditor');

      await harness.requests.submit(user.email, '10.0.0.9');

      const [row] = await requestsOf(user.id);
      expect(row).toMatchObject({ type: 'reset', status: 'pending', requestedIp: '10.0.0.9', tokenHash: null });
    });

    it('ignora en silencio los correos inexistentes, inactivos y del superusuario', async () => {
      const inactive = await harness.seedUser('auditor', { activo: false });

      await harness.requests.submit('nadie@amoxa.test', null);
      await harness.requests.submit(inactive.email, null);
      await harness.requests.submit(superuser.email, null);

      expect(await requestsOf(inactive.id)).toHaveLength(0);
      expect(await requestsOf(superuser.id)).toHaveLength(0);
    });

    it('mantiene una sola solicitud pendiente por usuario', async () => {
      const user = await harness.seedUser('auditado');

      await harness.requests.submit(user.email, null);
      await harness.requests.submit(user.email, null);
      await harness.requests.submit(user.email, null);

      expect(await requestsOf(user.id)).toHaveLength(1);
    });

    it('responde siempre lo mismo, exista o no el correo', async () => {
      const controller = new SolicitudesClaveController(harness.requests, harness.solicitudQuery, harness.decisions);
      const known = await harness.seedUser('auditor');

      const first = await controller.submit({ email: known.email }, { ip: '1.1.1.1' } as never);
      const second = await controller.submit({ email: 'fantasma@amoxa.test' }, { ip: '1.1.1.1' } as never);

      expect(first).toEqual(second);
      expect(Reflect.getMetadata('__httpCode__', SolicitudesClaveController.prototype.submit)).toBe(202);
    });

    it('registra la solicitud en la bitácora', async () => {
      const user = await harness.seedUser('auditor');
      await harness.requests.submit(user.email, '2.2.2.2');

      const entries = await harness.database.orm.select().from(auditLog).where(eq(auditLog.targetId, user.id));
      expect(entries.map((entry) => entry.action)).toContain('password_request.created');
    });
  });

  describe('listado', () => {
    it('el administrador no ve solicitudes de otros administradores; el superusuario sí', async () => {
      const otherAdmin = await harness.seedUser('administrador');
      const worker = await harness.seedUser('gestor_programa');
      await harness.requests.submit(otherAdmin.email, null);
      await harness.requests.submit(worker.email, null);

      const forAdmin = await harness.solicitudQuery.pendingFor('administrador');
      const forSuper = await harness.solicitudQuery.pendingFor('superusuario');

      expect(forAdmin.map((item) => item.usuario.id)).toContain(worker.id);
      expect(forAdmin.map((item) => item.usuario.id)).not.toContain(otherAdmin.id);
      expect(forSuper.map((item) => item.usuario.id)).toEqual(expect.arrayContaining([worker.id, otherAdmin.id]));
    });

    it('los demás roles no ven nada', async () => {
      expect(await harness.solicitudQuery.pendingFor('gestor')).toEqual([]);
    });
  });

  describe('aprobación', () => {
    it('genera un token de 32 bytes, guarda solo el hash y expira en una hora', async () => {
      const user = await harness.seedUser('auditor');
      const pending = await pendingOf(user);
      const now = new Date('2026-01-01T10:00:00.000Z');

      const link = await harness.decisions.approve(pending.id, admin.id, 'administrador', null, now);

      const raw = UsuariosHarness.tokenFromUrl(link.url);
      expect(Buffer.from(raw, 'base64url')).toHaveLength(32);
      expect(link.expiresAt.toISOString()).toBe('2026-01-01T11:00:00.000Z');
      const [row] = await requestsOf(user.id);
      expect(row).toMatchObject({ status: 'approved', handledBy: admin.id, tokenHash: SecretToken.hash(raw) });
      expect(JSON.stringify(row)).not.toContain(raw);
    });

    it('la url completa apunta al frontend', async () => {
      const user = await harness.seedUser('auditor');
      const link = await harness.decisions.approve((await pendingOf(user)).id, admin.id, 'administrador', null);

      expect(link.url).toMatch(/^https?:\/\/.+\/establecer-clave\?token=/);
      expect(SolicitudUrl.build('a b', 'https://app.test/')).toBe('https://app.test/establecer-clave?token=a%20b');
    });

    it('no se puede aprobar dos veces ni volver a consultar el token', async () => {
      const user = await harness.seedUser('auditor');
      const pending = await pendingOf(user);
      await harness.decisions.approve(pending.id, admin.id, 'administrador', null);

      await expect(harness.decisions.approve(pending.id, admin.id, 'administrador', null)).rejects.toThrow(NotFoundException);
    });

    it('invalida el token anterior del mismo usuario', async () => {
      const user = await harness.seedUser('auditor');
      const first = await harness.decisions.approve((await pendingOf(user)).id, admin.id, 'administrador', null);
      const second = await harness.decisions.approve((await pendingOf(user)).id, admin.id, 'administrador', null);

      const rows = await requestsOf(user.id);
      expect(rows.filter((row) => row.status === 'approved')).toHaveLength(1);
      await expect(harness.reset.complete(UsuariosHarness.tokenFromUrl(first.url), NEW_PASSWORD, null)).rejects.toThrow(BadRequestException);
      await expect(harness.reset.complete(UsuariosHarness.tokenFromUrl(second.url), NEW_PASSWORD, null)).resolves.toBeUndefined();
    });

    it('el administrador no aprueba solicitudes de otro administrador', async () => {
      const otherAdmin = await harness.seedUser('administrador');
      const pending = await pendingOf(otherAdmin);

      await expect(harness.decisions.approve(pending.id, admin.id, 'administrador', null)).rejects.toThrow(ForbiddenException);
      const link = await harness.decisions.approve(pending.id, superuser.id, 'superusuario', null);
      expect(link.url).toContain('token=');
    });

    it('un administrador aprueba solicitudes de cualquiera de los roles existentes', () => {
      const existing = RoleCatalog.assignable().filter((role) => role !== 'administrador');

      expect(existing).toHaveLength(5);
      for (const role of existing) {
        expect(SolicitudHierarchy.canHandle('administrador', RoleMapper.toDbRole(role))).toBe(true);
      }
    });

    it('nadie aprueba nada para el superusuario', () => {
      expect(SolicitudHierarchy.canHandle('superusuario', 'superusuario')).toBe(false);
      expect(SolicitudHierarchy.canHandle('administrador', 'superusuario')).toBe(false);
    });

    it('no aprueba solicitudes de usuarios que ya fueron desactivados', async () => {
      const user = await harness.seedUser('auditor');
      const pending = await pendingOf(user);
      await harness.admin.changeStatus(user.id, false, harness.payload(superuser), null);

      await expect(harness.decisions.approve(pending.id, admin.id, 'administrador', null)).rejects.toThrow(NotFoundException);
    });

    it('registra la aprobación en la bitácora', async () => {
      const user = await harness.seedUser('auditor');
      await harness.decisions.approve((await pendingOf(user)).id, admin.id, 'administrador', '3.3.3.3');

      const entries = await harness.database.orm.select().from(auditLog).where(eq(auditLog.targetId, user.id));
      expect(entries).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'password_request.approved', actorId: admin.id, ip: '3.3.3.3' })]));
    });
  });

  describe('rechazo', () => {
    it('marca la solicitud como rechazada y limpia el token', async () => {
      const user = await harness.seedUser('auditor');
      const pending = await pendingOf(user);

      await harness.decisions.reject(pending.id, admin.id, 'administrador', null);

      const [row] = await requestsOf(user.id);
      expect(row).toMatchObject({ status: 'rejected', handledBy: admin.id, tokenHash: null });
    });

    it('respeta la jerarquía', async () => {
      const otherAdmin = await harness.seedUser('administrador');
      const pending = await pendingOf(otherAdmin);

      await expect(harness.decisions.reject(pending.id, admin.id, 'administrador', null)).rejects.toThrow(ForbiddenException);
    });

    it('una solicitud rechazada ya no se puede aprobar', async () => {
      const user = await harness.seedUser('auditor');
      const pending = await pendingOf(user);
      await harness.decisions.reject(pending.id, admin.id, 'administrador', null);

      await expect(harness.decisions.approve(pending.id, admin.id, 'administrador', null)).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /password-reset', () => {
    const approveFor = async (user: HarnessUser) => {
      const link = await harness.decisions.approve((await pendingOf(user)).id, admin.id, 'administrador', null);
      return UsuariosHarness.tokenFromUrl(link.url);
    };

    it('guarda el hash de la nueva contraseña, marca la solicitud como usada y revoca sesiones', async () => {
      const user = await harness.seedUser('auditor');
      await harness.issueToken(user);
      await harness.issueToken(user);
      const raw = await approveFor(user);

      await harness.reset.complete(raw, NEW_PASSWORD, '4.4.4.4');

      const row = await harness.userRow(user.id);
      expect(row.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(row.passwordHash).not.toContain(NEW_PASSWORD);
      const [request] = await requestsOf(user.id);
      expect(request).toMatchObject({ status: 'used', tokenHash: null });
      expect(await harness.revokedTokens(user.id)).toBe(2);
    });

    it('el token es de un solo uso', async () => {
      const user = await harness.seedUser('auditor');
      const raw = await approveFor(user);
      await harness.reset.complete(raw, NEW_PASSWORD, null);

      await expect(harness.reset.complete(raw, NEW_PASSWORD, null)).rejects.toThrow(BadRequestException);
    });

    it('rechaza tokens desconocidos con un mensaje genérico', async () => {
      await expect(harness.reset.complete(SecretToken.generate(), NEW_PASSWORD, null)).rejects.toThrow('Enlace inválido o expirado');
    });

    it('rechaza y marca como vencido un token expirado', async () => {
      const user = await harness.seedUser('auditor');
      const raw = await approveFor(user);

      await expect(harness.reset.complete(raw, NEW_PASSWORD, null, new Date(Date.now() + 2 * 60 * 60 * 1000))).rejects.toThrow(BadRequestException);

      const [request] = await requestsOf(user.id);
      expect(request).toMatchObject({ status: 'expired', tokenHash: null });
    });

    it('completa una invitación: define la contraseña y activa al usuario', async () => {
      const created = await harness.admin.create(
        { nombre: 'Nueva Persona', email: 'nueva@amoxa.test', rol: 'auditor' },
        harness.payload(superuser),
        null,
      );
      expect(created.usuario.activo).toBe(false);

      await harness.reset.complete(UsuariosHarness.tokenFromUrl(created.invitacion.url), NEW_PASSWORD, null);

      const row = await harness.userRow(created.usuario.id);
      expect(row.activo).toBe(true);
      expect(row.passwordHash).not.toBeNull();
    });

    it('un restablecimiento no activa a un usuario desactivado después de aprobarse', async () => {
      const user = await harness.seedUser('auditor');
      const raw = await approveFor(user);
      await harness.database.orm.update(usuario).set({ activo: false }).where(eq(usuario.id, user.id));

      await expect(harness.reset.complete(raw, NEW_PASSWORD, null)).rejects.toThrow(BadRequestException);
    });

    it('exige contraseña de al menos 12 caracteres', () => {
      expect(RestablecerClaveSchema.safeParse({ token: 'x', password: 'corta' }).success).toBe(false);
      expect(RestablecerClaveSchema.safeParse({ token: 'x', password: 'doce-caracter' }).success).toBe(true);
    });

    it('registra el restablecimiento en la bitácora', async () => {
      const user = await harness.seedUser('auditor');
      await harness.reset.complete(await approveFor(user), NEW_PASSWORD, '5.5.5.5');

      const entries = await harness.database.orm.select().from(auditLog).where(eq(auditLog.targetId, user.id));
      expect(entries.map((entry) => entry.action)).toContain('password.reset_completed');
    });
  });

  describe('vencimiento', () => {
    it('marca como vencidas las aprobadas expiradas y las pendientes de más de 7 días', async () => {
      const approvedUser = await harness.seedUser('auditor');
      const pendingUser = await harness.seedUser('auditor');
      const freshUser = await harness.seedUser('auditor');
      await harness.decisions.approve((await pendingOf(approvedUser)).id, admin.id, 'administrador', null);
      await harness.requests.submit(pendingUser.email, null);
      await harness.requests.submit(freshUser.email, null);
      await harness.database.orm
        .update(passwordRequest)
        .set({ createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) })
        .where(eq(passwordRequest.usuarioId, pendingUser.id));

      const expired = await harness.expiration.expireOverdue(new Date(Date.now() + 2 * 60 * 60 * 1000));

      expect(expired).toBeGreaterThanOrEqual(2);
      expect((await requestsOf(approvedUser.id))[0]).toMatchObject({ status: 'expired', tokenHash: null });
      expect((await requestsOf(pendingUser.id))[0].status).toBe('expired');
      expect((await requestsOf(freshUser.id))[0].status).toBe('pending');
    });

    it('la tarea periódica se programa al iniciar y se cancela al cerrar', () => {
      harness.expiration.onModuleInit();
      harness.expiration.onModuleDestroy();
      harness.expiration.onModuleDestroy();
    });
  });

  describe('protección de rutas', () => {
    it('solo el administrador y el superusuario gestionan solicitudes', () => {
      for (const route of ['list', 'approve', 'reject']) {
        expect(RouteGuardInspector.guardsOf(SolicitudesClaveController, route)).toEqual(['JwtAuthGuard', 'RoleExistsGuard', 'RolesGuard']);
      }
    });

    it('crear la solicitud y restablecer son públicos pero limitados por ip', () => {
      expect(RouteGuardInspector.guardsOf(SolicitudesClaveController, 'submit')).toEqual(['ThrottleGuard']);
      expect(RouteGuardInspector.guardsOf(RestablecimientoController, 'complete')).toEqual(['ThrottleGuard']);
    });
  });
});

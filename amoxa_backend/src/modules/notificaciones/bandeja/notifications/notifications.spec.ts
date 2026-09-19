import { NotificationService } from '@notificaciones/notification.service.js';
import { NotificationsController } from '@notificaciones-bandeja-notifications/notifications.controller.js';
import { NotificationsDataProvider } from '@notificaciones-bandeja-notifications/notifications-data.provider.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { MarkReadSchema } from '@validators-notificaciones/mark-read.schema.js';
import { NotificationListQuerySchema } from '@validators-notificaciones/notification-list-query.schema.js';

describe('Bandeja de notificaciones', () => {
  let database: TestDatabase;
  let service: NotificationService;
  let controller: NotificationsController;
  let auditorId: string;
  let gestorId: string;
  let organizacionId: string;

  const requestOf = (id: string, rol: 'auditor' | 'gestor_programa') => new FakeRequest(rol, id, organizacionId).asRequest();

  beforeAll(async () => {
    database = await TestDatabase.create();
    service = new NotificationService(database.db);
    controller = new NotificationsController(service);
    organizacionId = await TestSeed.organizacion(database);
    auditorId = (await TestSeed.usuario(database, organizacionId, 'auditor')).id;
    gestorId = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
    await service.notifyUsers([auditorId], { tipo: 'aviso', titulo: 'Uno', mensaje: 'Primero' });
    await service.notifyUsers([auditorId], { tipo: 'aviso', titulo: 'Dos', mensaje: 'Segundo' });
    await service.notifyUsers([gestorId], { tipo: 'aviso', titulo: 'Ajena', mensaje: 'Del gestor' });
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('lista solo las notificaciones propias con el conteo de no leídas', async () => {
    const inbox = await controller.list(requestOf(auditorId, 'auditor'), {});

    expect(inbox.notificaciones.map((item) => item.title).sort()).toEqual(['Dos', 'Uno']);
    expect(inbox.sin_leer).toBe(2);
    expect(inbox.notificaciones[0]).toMatchObject({ estado: 'nueva', leidaEn: null });
  });

  it('marca como leídas solo las ids indicadas y solo las propias', async () => {
    const inbox = await controller.list(requestOf(auditorId, 'auditor'), {});
    const ajena = (await controller.list(requestOf(gestorId, 'gestor_programa'), {})).notificaciones[0].id;

    const result = await controller.markRead(requestOf(auditorId, 'auditor'), { ids: [inbox.notificaciones[0].id, ajena] });

    expect(result).toEqual({ marcadas: 1 });
    expect((await controller.list(requestOf(auditorId, 'auditor'), { soloNoLeidas: true })).notificaciones).toHaveLength(1);
    expect((await controller.list(requestOf(gestorId, 'gestor_programa'), { soloNoLeidas: true })).sin_leer).toBe(1);
  });

  it('sin ids marca todas las propias como leídas', async () => {
    const result = await controller.markRead(requestOf(auditorId, 'auditor'), {});

    expect(result).toEqual({ marcadas: 1 });
    expect((await controller.list(requestOf(auditorId, 'auditor'), {})).sin_leer).toBe(0);
    expect((await controller.list(requestOf(gestorId, 'gestor_programa'), {})).sin_leer).toBe(1);
  });

  it('entrega la bandeja como datos de la pantalla', async () => {
    const data = await new NotificationsDataProvider(service).load({
      screenId: 'notificaciones',
      user: new FakeRequest('auditor', auditorId, organizacionId).user!,
      role: 'auditor',
    });

    expect((data.data?.notificaciones as unknown[]).length).toBe(2);
    expect(data.data?.sin_leer).toBe(0);
  });

  it('protege las rutas con el permiso de leer notificaciones', () => {
    expect(RouteGuardInspector.unprotected(NotificationsController)).toEqual([]);
    expect(RouteGuardInspector.guardsOf(NotificationsController, 'list')).toContain('PermissionsGuard');
    expect(RouteGuardInspector.guardsOf(NotificationsController, 'markRead')).toContain('PermissionsGuard');
  });

  it('valida los cuerpos: ids UUID, el resto del contexto se ignora', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    expect(MarkReadSchema.safeParse({ ids: [id], notificaciones: [{ x: 1 }] }).data).toEqual({ ids: [id] });
    expect(MarkReadSchema.safeParse(undefined).data).toEqual({});
    expect(MarkReadSchema.safeParse({ ids: ['no-uuid'] }).success).toBe(false);
    expect(NotificationListQuerySchema.safeParse({ soloNoLeidas: 'true' }).data).toEqual({ soloNoLeidas: true });
    expect(NotificationListQuerySchema.safeParse({ soloNoLeidas: 'quizas' }).success).toBe(false);
  });
});

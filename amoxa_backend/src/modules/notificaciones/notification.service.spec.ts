import { NotificationService } from '@notificaciones/notification.service.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';

describe('NotificationService', () => {
  let database: TestDatabase;
  let service: NotificationService;
  let organizacionId: string;
  let gestorId: string;
  let auditorId: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    service = new NotificationService(database.db);
    organizacionId = await TestSeed.organizacion(database);
    gestorId = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
    auditorId = (await TestSeed.usuario(database, organizacionId, 'auditor')).id;
    const otra = await TestSeed.organizacion(database, 'Otra organización');
    await TestSeed.usuario(database, otra, 'gestor_programa');
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('notifica a todos los usuarios de un rol dentro de su organización', async () => {
    const created = await service.notifyRole(organizacionId, 'gestor', {
      tipo: 'programa_aprobado',
      titulo: 'Programa aprobado',
      mensaje: 'La dirección aprobó el programa',
    });

    expect(created).toBe(1);
    expect(await service.listFor(gestorId)).toHaveLength(1);
    expect(await service.listFor(auditorId)).toHaveLength(0);
  });

  it('marca como leídas solo las notificaciones del usuario y solo una vez', async () => {
    await service.notifyUsers([auditorId, auditorId], { tipo: 'aviso', titulo: 'Aviso', mensaje: 'Hola' });

    expect(await service.listFor(auditorId, true)).toHaveLength(1);
    expect(await service.markRead(auditorId)).toBe(1);
    expect(await service.markRead(auditorId)).toBe(0);
    expect(await service.listFor(auditorId, true)).toHaveLength(0);
    expect(await service.listFor(auditorId)).toHaveLength(1);
  });

  it('no crea nada para el rol sistema ni para una lista vacía', async () => {
    expect(await service.notifyRole(organizacionId, 'sistema', { tipo: 'x', titulo: 'x', mensaje: 'x' })).toBe(0);
    expect(await service.notifyUsers([], { tipo: 'x', titulo: 'x', mensaje: 'x' })).toBe(0);
  });
});

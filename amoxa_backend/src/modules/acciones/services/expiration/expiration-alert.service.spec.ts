import { and, eq } from 'drizzle-orm';
import { accion, notificacion } from '@db/schema/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditFlowSeed, type AuditScenario } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { AccionCreationService } from '@acciones-services-accion/accion-creation.service.js';
import { ExpirationAlertService } from '@acciones-services-expiration/expiration-alert.service.js';
import { ExpirationTimerService } from '@acciones-services-expiration/expiration-timer.service.js';

vi.setConfig({ testTimeout: 60000 });

const CREATED_AT = new Date('2026-05-01T12:00:00.000Z');

describe('ExpirationAlertService', () => {
  let database: TestDatabase;
  let creation: AccionCreationService;
  let alerts: ExpirationAlertService;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    creation = new AccionCreationService(database.db, notifications, versions);
    alerts = new ExpirationAlertService(database.db, notifications, versions);
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  const setup = async (fechaLimite: string): Promise<{ s: AuditScenario; id: string }> => {
    const s = await AuditFlowSeed.create(database);
    const created = await creation.create(
      s.hallazgoNcId,
      TokenFactory.of(s.auditado),
      { correccion: 'Corregir', causa_raiz: 'Causa', responsable_id: s.auditado.id, fecha_limite: fechaLimite },
      CREATED_AT,
    );
    return { s, id: created.id };
  };

  const count = async (usuarioId: string, tipo: string) =>
    (
      await database.db
        .select()
        .from(notificacion)
        .where(and(eq(notificacion.usuarioId, usuarioId), eq(notificacion.tipo, tipo)))
    ).length;

  it('avisa 7 y 1 día antes sin duplicar avisos', async () => {
    const { s } = await setup('2026-05-17');

    const early = await alerts.run(new Date('2026-05-09T10:00:00.000Z'));
    expect(early.previa7).toBe(0);
    const seven = await alerts.run(new Date('2026-05-10T10:00:00.000Z'));
    const again = await alerts.run(new Date('2026-05-10T18:00:00.000Z'));
    expect(seven.previa7).toBeGreaterThanOrEqual(1);
    expect(again.previa7).toBe(0);
    expect(await count(s.auditado.id, 'accion_vence_7')).toBe(1);

    await alerts.run(new Date('2026-05-16T10:00:00.000Z'));
    await alerts.run(new Date('2026-05-16T11:00:00.000Z'));
    expect(await count(s.auditado.id, 'accion_vence_1')).toBe(1);
  });

  it('al vencer marca vencida y avisa al responsable y al gestor una sola vez', async () => {
    const { s, id } = await setup('2026-05-05');

    const first = await alerts.run(new Date('2026-05-06T09:00:00.000Z'));
    const second = await alerts.run(new Date('2026-05-07T09:00:00.000Z'));

    expect(first.vencidas).toBeGreaterThanOrEqual(1);
    expect(second.vencidas).toBe(0);
    const [row] = await database.db.select().from(accion).where(eq(accion.id, id));
    expect(row.estado).toBe('vencida');
    expect(await count(s.auditado.id, 'accion_vencida')).toBe(1);
    expect(await count(s.gestor.id, 'accion_vencida')).toBe(1);
  });

  it('no alerta acciones ya completadas', async () => {
    const { s, id } = await setup('2026-05-05');
    await database.orm.update(accion).set({ estado: 'completada', fechaCierre: '2026-05-04' }).where(eq(accion.id, id));

    await alerts.run(new Date('2026-05-08T09:00:00.000Z'));

    expect(await count(s.auditado.id, 'accion_vencida')).toBe(0);
  });

  it('el temporizador se crea sin retener el proceso y se detiene al apagar', () => {
    const timer = new ExpirationTimerService(alerts);

    timer.onApplicationBootstrap();
    expect(ExpirationTimerService.INTERVAL_MS).toBe(3_600_000);
    timer.onApplicationShutdown();
    timer.onApplicationShutdown();
  });
});

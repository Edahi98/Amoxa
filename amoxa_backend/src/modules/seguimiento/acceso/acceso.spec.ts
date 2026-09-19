import { ActivityFeedQuery } from '@seguimiento-acceso/activity-feed.query.js';
import { AdminCountsQuery } from '@seguimiento-acceso/admin-counts.query.js';
import { HomeCountsQuery } from '@seguimiento-acceso/home-counts.query.js';
import { InicioDataProvider } from '@seguimiento-acceso/inicio-data.provider.js';
import { LoginDataProvider } from '@seguimiento-acceso/login-data.provider.js';
import { DashboardDataProvider } from '@seguimiento-indicadores/dashboard-data.provider.js';
import { IndicatorQuery } from '@seguimiento-indicadores-indicator/indicator-query.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';
import { NotificationsDataProvider } from '@notificaciones-bandeja-notifications/notifications-data.provider.js';
import { RecordHistoryDataProvider } from '@registros-consulta-record/record-history-data.provider.js';
import { RecordSearchDataProvider } from '@registros-consulta-record/record-search-data.provider.js';
import { RevisionDireccionDataProvider } from '@seguimiento-revision/revision-direccion-data.provider.js';
import { RevisionProgramaDataProvider } from '@seguimiento-revision/revision-programa-data.provider.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { SeguimientoFixture } from '@testing/seguimiento/seguimiento-fixture.js';

describe('Inicio, acceso y dashboard', () => {
  let database: TestDatabase;
  let counts: HomeCountsQuery;
  let organizacionId: string;
  let ids: Record<string, string>;

  const user = (key: string, rol: 'admin' | 'gestor_programa' | 'lider_auditor' | 'auditor' | 'auditado' | 'superusuario' | 'administrador') =>
    new FakeRequest(rol, ids[key], organizacionId).user!;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const fixture = new SeguimientoFixture(database);
    organizacionId = await TestSeed.organizacion(database);
    const gestor = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
    const liderA = (await TestSeed.usuario(database, organizacionId, 'lider_auditor')).id;
    const liderB = (await TestSeed.usuario(database, organizacionId, 'lider_auditor')).id;
    const auditor = (await TestSeed.usuario(database, organizacionId, 'auditor')).id;
    const duenoA = (await TestSeed.usuario(database, organizacionId, 'auditado')).id;
    const duenoB = (await TestSeed.usuario(database, organizacionId, 'auditado')).id;
    ids = { gestor, liderA, liderB, auditor, duenoA, duenoB };

    const procesoA = await fixture.proceso(organizacionId, duenoA, 'Compras');
    const procesoB = await fixture.proceso(organizacionId, duenoB, 'Producción');
    const otraOrganizacionId = await TestSeed.organizacion(database, 'Otra organización');
    const duenoAjeno = (await TestSeed.usuario(database, otraOrganizacionId, 'auditado')).id;
    await fixture.proceso(otraOrganizacionId, duenoAjeno, 'Logística ajena');
    await fixture.asignarProceso(duenoA, procesoA);
    const programa = await fixture.programa(organizacionId, '2026');
    const auditoriaA = await fixture.auditoria(programa, liderA, 'en_curso', [procesoA]);
    const auditoriaB = await fixture.auditoria(programa, liderB, 'en_curso', [procesoB]);
    await fixture.auditoria(programa, liderB, 'planificada', [procesoB]);
    await fixture.equipo(auditoriaA, auditor);
    const hallazgoA = await fixture.hallazgo(auditoriaA, procesoA, auditor, 'NC');
    const hallazgoB = await fixture.hallazgo(auditoriaB, procesoB, auditor, 'NC');
    const dia = (offset: number) => HomeCountsQuery.addDays(new Date().toISOString().slice(0, 10), offset);
    await fixture.accion(hallazgoA, duenoA, 'pendiente', dia(3));
    await fixture.accion(hallazgoA, duenoA, 'pendiente', dia(30));
    await fixture.accion(hallazgoA, duenoA, 'completada', dia(2));
    await fixture.accion(hallazgoB, duenoB, 'en_progreso', dia(1));

    await new NotificationService(database.db).notifyUsers([gestor], { tipo: 'aviso', titulo: 'x', mensaje: 'y' });
    counts = new HomeCountsQuery(database.db);
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('el gestor ve los conteos de toda la organización', async () => {
    expect(await counts.load(user('gestor', 'gestor_programa'), 'gestor')).toEqual({
      notificaciones_sin_leer: 1,
      acciones_por_vencer: 2,
      auditorias_en_curso: 2,
    });
  });

  it('cada rol solo cuenta lo suyo', async () => {
    expect(await counts.load(user('liderA', 'lider_auditor'), 'lider')).toEqual({
      notificaciones_sin_leer: 0,
      acciones_por_vencer: 1,
      auditorias_en_curso: 1,
    });
    expect(await counts.load(user('auditor', 'auditor'), 'auditor')).toMatchObject({ acciones_por_vencer: 1, auditorias_en_curso: 1 });
    expect(await counts.load(user('duenoA', 'auditado'), 'dueno_proceso')).toMatchObject({ acciones_por_vencer: 1, auditorias_en_curso: 1 });
    expect(await counts.load(user('duenoB', 'auditado'), 'dueno_proceso')).toMatchObject({ acciones_por_vencer: 0, auditorias_en_curso: 0 });
  });

  it('el superusuario y el administrador ven conteos de administración y no de auditorías', async () => {
    const superuser = await TestSeed.usuario(database, organizacionId, 'superusuario');
    const provider = new InicioDataProvider(counts, new AdminCountsQuery(database.db), new ActivityFeedQuery(database.db), database.db);

    const inicio = await provider.load({ screenId: 'inicio', user: new FakeRequest('superusuario', superuser.id, organizacionId).user!, role: 'superusuario' });

    expect(inicio.data?.conteos).toEqual({
      notificaciones_sin_leer: 0,
      solicitudes_pendientes: 0,
      invitaciones_pendientes: 0,
      usuarios_activos: expect.any(Number),
    });
    expect(inicio.data).toMatchObject({ en_curso: [], agenda: expect.any(Array), user: { nombre: expect.any(String) } });
  });

  it('entrega los datos de inicio, login y dashboard y quedan registrados por pantalla', async () => {
    const inicio = await new InicioDataProvider(counts, new AdminCountsQuery(database.db), new ActivityFeedQuery(database.db), database.db).load({
      screenId: 'inicio',
      user: user('gestor', 'gestor_programa'),
      role: 'gestor',
    });
    const login = await new LoginDataProvider().load();
    const dashboard = await new DashboardDataProvider(new IndicatorsService(new IndicatorQuery(database.db)), database.db).load({
      screenId: 'dashboard.programa',
      user: user('gestor', 'gestor_programa'),
      role: 'gestor',
    });

    expect(inicio.data?.conteos).toMatchObject({ acciones_por_vencer: 2 });
    expect(login.data).toEqual({ email: '', password: '' });
    expect(dashboard.data?.filtros).toEqual({ periodo: '', area: '' });
    expect(dashboard.data?.['opciones']).toEqual({
      procesos: [
        { value: expect.any(String), label: 'Compras' },
        { value: expect.any(String), label: 'Producción' },
      ],
    });
    expect(dashboard.data?.indicadores).toHaveProperty('incumplimientos_por_area.labels');
    const esperados = [
      ['dashboard.programa', DashboardDataProvider],
      ['revision.direccion', RevisionDireccionDataProvider],
      ['revision.programa', RevisionProgramaDataProvider],
      ['registro.buscar', RecordSearchDataProvider],
      ['registro.historial', RecordHistoryDataProvider],
      ['notificaciones', NotificationsDataProvider],
      ['inicio', InicioDataProvider],
      ['acceso.login', LoginDataProvider],
    ] as const;
    for (const [screenId, provider] of esperados) {
      expect(ScreenDataRegistry.providerFor(screenId), screenId).toBe(provider);
    }
  });

  it('suma días a una fecha ISO', () => {
    expect(HomeCountsQuery.addDays('2026-12-28', 7)).toBe('2027-01-04');
  });
});

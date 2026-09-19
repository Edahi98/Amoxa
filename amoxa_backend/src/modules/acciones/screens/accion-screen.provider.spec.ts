import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditFlowSeed } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { AccionScreenProvider } from '@acciones-screens/accion-screen.provider.js';
import { AccionClosureService } from '@acciones-services-accion/accion-closure.service.js';
import { AccionCreationService } from '@acciones-services-accion/accion-creation.service.js';
import { AccionHallazgoLookupService } from '@acciones-services-accion/accion-hallazgo-lookup.service.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';
import '@screens/index.js';

vi.setConfig({ testTimeout: 60000 });

describe('AccionScreenProvider', () => {
  let database: TestDatabase;
  let provider: AccionScreenProvider;
  let creation: AccionCreationService;
  let closure: AccionClosureService;
  const fecha = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    const loader = new AccionLoaderService(database.db);
    creation = new AccionCreationService(database.db, notifications, versions);
    closure = new AccionClosureService(database.db, loader, notifications, versions);
    provider = new AccionScreenProvider(
      new AccionQueryService(database.db, loader),
      loader,
      new AccionHallazgoLookupService(database.db),
      versions,
    );
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('se registra para las cuatro pantallas de acciones', () => {
    for (const screenId of ['accion.lista', 'accion.crear', 'accion.cierre', 'accion.verificar']) {
      expect(ScreenDataRegistry.providerFor(screenId)).toBe(AccionScreenProvider);
    }
  });

  it('crear muestra la no conformidad y las opciones de responsable en la pantalla', async () => {
    const s = await AuditFlowSeed.create(database);
    const du = TokenFactory.of(s.auditado);

    const loaded = await provider.load({ screenId: 'accion.crear', user: du, role: 'dueno_proceso' });

    expect(loaded.entity).toMatchObject({ type: 'hallazgo', id: s.hallazgoNcId });
    expect((loaded.data?.['hallazgo'] as { kind: string }).kind).toBe('nc_mayor');
    const context = ScreenContextBuilder.forUser({ id: s.auditado.id, rol: 'dueno_proceso' }).entity(loaded.entity!).data(loaded.data!);
    expect(JSON.stringify(ScreenFactory.createById('accion.crear', context).root)).toContain(s.auditado.id);
  });

  it('las listas por rol: dueño ve las suyas, gestor todas, auditor las por verificar', async () => {
    const s = await AuditFlowSeed.create(database);
    const created = await creation.create(
      s.hallazgoNcId,
      TokenFactory.of(s.auditado),
      { correccion: 'Corregir', causa_raiz: 'Causa', responsable_id: s.auditado.id, fecha_limite: fecha },
    );
    const titles = async (user: ReturnType<typeof TokenFactory.of>, role: 'dueno_proceso' | 'gestor' | 'auditor') =>
      ((await provider.load({ screenId: 'accion.lista', user, role })).data?.['acciones'] as unknown[]).length;

    expect(await titles(TokenFactory.of(s.auditado), 'dueno_proceso')).toBe(1);
    expect(await titles(TokenFactory.of(s.gestor), 'gestor')).toBe(1);
    expect(await titles(TokenFactory.of(s.auditor), 'auditor')).toBe(0);

    await closure.report(created.id, TokenFactory.of(s.auditado), { evidencias: [{ nombre: 'acta.pdf' }] });
    expect(await titles(TokenFactory.of(s.auditor), 'auditor')).toBe(1);
  });

  it('cierre y verificar entregan la tarjeta, el estado y la bandera del verificador', async () => {
    const s = await AuditFlowSeed.create(database);
    const du = TokenFactory.of(s.auditado);
    const created = await creation.create(s.hallazgoNcId, du, {
      correccion: 'Corregir',
      causa_raiz: 'Causa',
      responsable_id: s.auditado.id,
      fecha_limite: fecha,
    });

    const cierre = await provider.load({ screenId: 'accion.cierre', user: du, role: 'dueno_proceso', entityId: created.id });
    expect(cierre.entity).toMatchObject({ type: 'accion', estado: 'abierta' });
    expect((cierre.data?.['accion'] as { daysLeft: number }).daysLeft).toBe(15);

    await closure.report(created.id, du, { evidencias: [{ nombre: 'acta.pdf' }] });
    const verificar = await provider.load({ screenId: 'accion.verificar', user: TokenFactory.of(s.auditor), role: 'auditor', entityId: created.id });

    expect(verificar.entity?.estado).toBe('reportada');
    expect((verificar.data?.['accion'] as { verificador_es_responsable: boolean }).verificador_es_responsable).toBe(false);
    expect((verificar.data?.['verificacion'] as { eficaz: boolean }).eficaz).toBe(true);

    const propio = await provider.load({ screenId: 'accion.verificar', user: du, role: 'auditor', entityId: created.id });
    expect((propio.data?.['accion'] as { verificador_es_responsable: boolean }).verificador_es_responsable).toBe(true);

    const other = await AuditFlowSeed.create(database);
    await expect(
      provider.load({ screenId: 'accion.cierre', user: TokenFactory.of(other.auditado), role: 'dueno_proceso', entityId: created.id }),
    ).rejects.toThrow('Acción no encontrada');
  });
});

import { AuditFlowSeed } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import { InformeScreenProvider } from '@informes-screens/informe-screen.provider.js';
import { InformeDistributionService } from '@informes-services-informe/informe-distribution.service.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeEntityResolverService } from '@informes-services-informe/informe-entity-resolver.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';
import { InformeReviewService } from '@informes-services-informe/informe-review.service.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import '@screens/index.js';

vi.setConfig({ testTimeout: 60000 });

describe('InformeScreenProvider', () => {
  let database: TestDatabase;
  let provider: InformeScreenProvider;
  let review: InformeReviewService;
  let distribution: InformeDistributionService;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    const loader = new InformeLoaderService(database.db);
    const drafts = new InformeDraftService(database.db, loader, notifications, versions);
    const reader = new InformeReadService(database.db, loader, drafts, versions);
    review = new InformeReviewService(database.db, loader, versions);
    distribution = new InformeDistributionService(database.db, loader, notifications, versions);
    provider = new InformeScreenProvider(new InformeEntityResolverService(database.db, drafts, reader), reader, distribution, versions);
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('se registra para las tres pantallas de informe', () => {
    for (const screenId of ['informe.vista_previa', 'informe.distribuir', 'informe.ver']) {
      expect(ScreenDataRegistry.providerFor(screenId)).toBe(InformeScreenProvider);
    }
  });

  it('la vista previa crea el borrador perezosamente a partir de la auditoría cerrada', async () => {
    const s = await AuditFlowSeed.create(database);

    const loaded = await provider.load({
      screenId: 'informe.vista_previa',
      user: TokenFactory.of(s.lider),
      role: 'lider',
      entityId: s.auditoriaId,
    });

    expect(loaded.entity).toMatchObject({ type: 'informe', estado: 'borrador' });
    const informe = loaded.data?.['informe'] as Record<string, string>;
    expect(informe['conclusiones']).toContain('no conformidad');
    expect(informe['hallazgos']).toContain('cláusula 8.4.1');
    expect(informe['resumen']).toContain('Compras');
  });

  it('sin entidad, el líder recibe el borrador de su auditoría cerrada', async () => {
    const s = await AuditFlowSeed.create(database);

    const loaded = await provider.load({ screenId: 'informe.vista_previa', user: TokenFactory.of(s.lider), role: 'lider' });

    expect(loaded.entity?.id).toBeDefined();
  });

  it('distribuir entrega opciones y la bandera incluye_direccion, que la pantalla usa', async () => {
    const s = await AuditFlowSeed.create(database);
    const lider = TokenFactory.of(s.lider);
    const first = await provider.load({ screenId: 'informe.vista_previa', user: lider, role: 'lider', entityId: s.auditoriaId });
    await review.sign(first.entity!.id, lider, 'Ana Líder');

    const loaded = await provider.load({ screenId: 'informe.distribuir', user: lider, role: 'lider', entityId: first.entity!.id });

    expect(loaded.entity?.estado).toBe('firmado');
    const distribucion = loaded.data?.['distribucion'] as { destinatarios: string[]; incluye_direccion: boolean };
    expect(distribucion.incluye_direccion).toBe(true);
    expect(distribucion.destinatarios).toContain(s.admin.id);
    const opciones = (loaded.data?.['opciones'] as { destinatarios: { value: string }[] }).destinatarios;
    expect(opciones.map((item) => item.value)).toContain(s.auditado.id);

    const context = ScreenContextBuilder.forUser({ id: s.lider.id, rol: 'lider' }).entity(loaded.entity!).data(loaded.data!);
    const screen = ScreenFactory.createById('informe.distribuir', context);
    const picker = JSON.stringify(screen.root);
    expect(picker).toContain(s.admin.id);
  });

  it('ver informe entrega la constancia de lectura de la dirección', async () => {
    const s = await AuditFlowSeed.create(database);
    const lider = TokenFactory.of(s.lider);
    const first = await provider.load({ screenId: 'informe.vista_previa', user: lider, role: 'lider', entityId: s.auditoriaId });
    await review.sign(first.entity!.id, lider, 'Ana Líder');
    await distribution.distribute(first.entity!.id, lider, [s.admin.id]);

    const admin = TokenFactory.of(s.admin);
    const before = await provider.load({ screenId: 'informe.ver', user: admin, role: 'direccion' });

    expect(before.entity?.estado).toBe('distribuido');
    expect((before.data?.['distribucion'] as { leido_en: string }).leido_en).toBe('');
  });

  it('devuelve datos vacíos si no hay informe disponible', async () => {
    const s = await AuditFlowSeed.create(database, 'en_curso');

    const loaded = await provider.load({ screenId: 'informe.ver', user: TokenFactory.of(s.admin), role: 'direccion' });

    expect(loaded.entity).toBeUndefined();
  });
});

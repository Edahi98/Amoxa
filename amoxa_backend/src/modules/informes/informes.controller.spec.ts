import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditFlowSeed } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { StreamCollector } from '@testing-http/stream-collector.js';
import { InformesController } from '@informes/informes.controller.js';
import { InformeApprovalService } from '@informes-services-informe/informe-approval.service.js';
import { InformeDistributionService } from '@informes-services-informe/informe-distribution.service.js';
import { InformeDocumentService } from '@informes-services-informe/informe-document.service.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';
import { InformeReviewService } from '@informes-services-informe/informe-review.service.js';

vi.setConfig({ testTimeout: 60000 });

describe('InformesController', () => {
  let database: TestDatabase;
  let controller: InformesController;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    const loader = new InformeLoaderService(database.db);
    const drafts = new InformeDraftService(database.db, loader, notifications, versions);
    const reader = new InformeReadService(database.db, loader, drafts, versions);
    controller = new InformesController(
      reader,
      new InformeReviewService(database.db, loader, versions),
      new InformeDistributionService(database.db, loader, notifications, versions),
      new InformeApprovalService(database.db, loader, notifications, versions),
      new InformeDocumentService(reader),
    );
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('todas las rutas exigen sesión y rol', () => {
    expect(RouteGuardInspector.unprotected(InformesController)).toEqual([]);
  });

  it('cada ruta declara el permiso de la tabla de acciones', () => {
    for (const route of ['updateConclusions', 'sign', 'distribute', 'acknowledge', 'approve']) {
      expect(RouteGuardInspector.guardsOf(InformesController, route)).toContain('PermissionsGuard');
    }
    expect(RouteGuardInspector.routes(InformesController).map((item) => item.route).sort()).toEqual(
      ['acknowledge', 'approve', 'detail', 'distribute', 'document', 'list', 'sign', 'updateConclusions'].sort(),
    );
  });

  it('el líder genera y firma; la dirección recibe el documento .docx del informe distribuido', async () => {
    const s = await AuditFlowSeed.create(database);
    const lider = new FakeRequest('lider_auditor', s.lider.id, s.organizacionId).asRequest();
    const admin = new FakeRequest('admin', s.admin.id, s.organizacionId).asRequest();

    const [resumen] = await controller.list({ auditoriaId: s.auditoriaId }, lider);
    await controller.updateConclusions(resumen.id, { conclusiones: 'Conclusiones del líder' }, lider);
    await controller.sign(resumen.id, { firma: 'Ana Líder' }, lider);
    await controller.distribute(resumen.id, { destinatarios: [s.admin.id] }, lider);
    await controller.acknowledge(resumen.id, admin);

    const detail = await controller.detail(resumen.id, admin);
    expect(detail.estado).toBe('distribuido');

    const headers: Record<string, string> = {};
    const response = { set: (values: Record<string, string>) => Object.assign(headers, values) } as never;
    const file = await controller.document(resumen.id, admin, response);
    const buffer = await StreamCollector.toBuffer(file.getStream());
    const text = await DocxInspector.text(buffer);

    expect(headers['Content-Disposition']).toContain('.docx');
    expect(text).toContain('Informe de auditoría interna');
    expect(text).toContain('Conclusiones del líder');
    expect(text).toContain('No se evalúan los proveedores críticos');
    expect(text).toContain('9.2.2 d)');
  });

  it('otra organización recibe 404', async () => {
    const a = await AuditFlowSeed.create(database);
    const b = await AuditFlowSeed.create(database);
    const lider = new FakeRequest('lider_auditor', a.lider.id, a.organizacionId).asRequest();
    const [resumen] = await controller.list({ auditoriaId: a.auditoriaId }, lider);
    const intruso = new FakeRequest('gestor_programa', b.gestor.id, b.organizacionId).asRequest();

    await expect(controller.detail(resumen.id, intruso)).rejects.toThrow('Informe no encontrado');
    await expect(controller.approve(resumen.id, intruso)).rejects.toThrow('Informe no encontrado');
  });
});

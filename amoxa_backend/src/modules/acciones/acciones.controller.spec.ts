import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditFlowSeed } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { StreamCollector } from '@testing-http/stream-collector.js';
import { AccionesController } from '@acciones/acciones.controller.js';
import { AccionClosureService } from '@acciones-services-accion/accion-closure.service.js';
import { AccionCreationService } from '@acciones-services-accion/accion-creation.service.js';
import { AccionDocumentService } from '@acciones-services-accion/accion-document.service.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';
import { AccionVerificationService } from '@acciones-services-accion/accion-verification.service.js';

vi.setConfig({ testTimeout: 60000 });

describe('AccionesController', () => {
  let database: TestDatabase;
  let controller: AccionesController;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    const loader = new AccionLoaderService(database.db);
    const queries = new AccionQueryService(database.db, loader);
    controller = new AccionesController(
      queries,
      new AccionCreationService(database.db, notifications, versions),
      new AccionClosureService(database.db, loader, notifications, versions),
      new AccionVerificationService(database.db, loader, notifications, versions),
      new AccionDocumentService(queries),
    );
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('todas las rutas exigen sesión y rol, y las de escritura exigen permiso', () => {
    expect(RouteGuardInspector.unprotected(AccionesController)).toEqual([]);
    for (const route of ['create', 'reportClosure', 'verify', 'reopen', 'list', 'detail', 'document']) {
      expect(RouteGuardInspector.guardsOf(AccionesController, route)).toContain('PermissionsGuard');
    }
  });

  it('recorre el ciclo completo y entrega el formulario .docx con la verificación', async () => {
    const s = await AuditFlowSeed.create(database);
    const du = new FakeRequest('auditado', s.auditado.id, s.organizacionId).asRequest();
    const au = new FakeRequest('auditor', s.auditor.id, s.organizacionId).asRequest();
    const fecha = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);

    const created = await controller.create(
      s.hallazgoNcId,
      { correccion: 'Se evaluó a los proveedores', causa_raiz: 'Faltaba el procedimiento', responsable_id: s.auditado.id, fecha_limite: fecha },
      du,
    );
    await controller.reportClosure(created.id, { evidencias: [{ nombre: 'acta.pdf' }] }, du);
    await controller.verify(created.id, { evidencias: [{ nombre: 'revision.pdf' }], comentario: 'Verificada en sitio' }, au);

    const headers: Record<string, string> = {};
    const response = { set: (values: Record<string, string>) => Object.assign(headers, values) } as never;
    const file = await controller.document(created.id, new FakeRequest('gestor_programa', s.gestor.id, s.organizacionId).asRequest(), response);
    const text = await DocxInspector.text(await StreamCollector.toBuffer(file.getStream()));

    expect(headers['Content-Disposition']).toContain('.docx');
    expect(text).toContain('Formulario de acción correctiva');
    expect(text).toContain('Faltaba el procedimiento');
    expect(text).toContain('acta.pdf');
    expect(text).toContain('Verificada en sitio');
    expect(text).toContain('☒ Eficaz');
    expect(text).toContain('☐ No eficaz');
    expect((await controller.list({}, new FakeRequest('gestor_programa', s.gestor.id, s.organizacionId).asRequest()))[0].estado).toBe('verificada');
  });
});

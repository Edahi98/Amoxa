import { FakeRequest } from '@testing-fakes/fake-request.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { RoutePermissionInspector } from '@testing-http-route/route-permission-inspector.js';
import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';
import { AuditoriasController } from '@auditorias-controllers/auditorias.controller.js';
import { ProgramaAuditoriasController } from '@auditorias-controllers/programa-auditorias.controller.js';

describe('controladores de auditorías', () => {
  let fx: AuditoriaFixture;
  let controller: AuditoriasController;
  let creator: ProgramaAuditoriasController;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
    controller = new AuditoriasController(fx.reader, fx.access, fx.alcance, fx.contacto, fx.equipo, fx.plan, fx.documents);
    creator = new ProgramaAuditoriasController(fx.creator);
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  const request = (rol: 'gestor_programa' | 'lider_auditor' | 'auditor' | 'auditado', id: string, org = fx.organizacionId) =>
    new FakeRequest(rol, id, org).asRequest();

  it('todas las rutas exigen sesión y rol existente', () => {
    expect(RouteGuardInspector.unprotected(AuditoriasController)).toEqual([]);
    expect(RouteGuardInspector.unprotected(ProgramaAuditoriasController)).toEqual([]);
  });

  it('cada ruta pide el permiso de su acción', () => {
    const expected: Record<string, string[]> = {
      defineScope: ['auditoria.definir_alcance'],
      reviewScope: ['auditoria.revisar_alcance'],
      confirmContact: ['auditoria.confirmar_contacto'],
      respondContact: ['auditoria.responder_contacto'],
      assignTeam: ['auditoria.asignar_equipo'],
      savePlan: ['auditoria.elaborar_plan'],
      sendPlan: ['auditoria.elaborar_plan'],
      proposeDate: ['auditoria.aprobar_plan'],
      approvePlan: ['auditoria.aprobar_plan'],
    };
    for (const [route, permissions] of Object.entries(expected)) {
      expect(RoutePermissionInspector.of(AuditoriasController, route).all, route).toEqual(permissions);
      expect(RouteGuardInspector.guardsOf(AuditoriasController, route), route).toContain('PermissionsGuard');
    }
    for (const route of ['list', 'detail', 'planDocument', 'notificationDocument']) {
      expect(RoutePermissionInspector.of(AuditoriasController, route).any, route).toEqual(
        expect.arrayContaining(['auditoria.consultar', 'auditoria.consultar_area']),
      );
    }
    expect(RoutePermissionInspector.of(ProgramaAuditoriasController, 'create').all).toEqual(['auditoria.crear']);
  });

  it('crea la auditoría desde el programa y recorre el flujo por los controladores', async () => {
    const created = await creator.create(
      fx.programaId,
      { plantillaId: fx.plantillaId, liderId: fx.lider.id, procesoIds: [fx.procesoCompras], metodo: 'in_situ', criterios: ['9.2'] },
      request('gestor_programa', fx.gestor.id),
    );

    const listed = await controller.list(request('gestor_programa', fx.gestor.id), undefined);
    expect(listed.map((item) => item.id)).toEqual([created.id]);

    await controller.assignTeam(created.id, { miembros: [fx.auditorA.id] }, request('gestor_programa', fx.gestor.id));
    await controller.confirmContact(
      created.id,
      { informacion_suficiente: true, cooperacion: true, tiempo: true },
      request('lider_auditor', fx.lider.id),
    );
    await controller.savePlan(
      created.id,
      { fecha_inicio: '2099-11-10', fecha_fin: '2099-11-11', agenda: 'Apertura', tareas: 'Ana Auditora: Revisar' },
      request('lider_auditor', fx.lider.id),
    );
    await controller.sendPlan(created.id, request('lider_auditor', fx.lider.id));
    const approved = await controller.approvePlan(created.id, request('auditado', fx.auditado.id));

    expect(approved.plan.estado).toBe('aprobado');
    const detail = await controller.detail(created.id, request('auditor', fx.auditorA.id));
    expect(detail.planAprobado).toBe(true);
  });

  it('sirve los documentos como adjunto .docx', async () => {
    const [item] = await controller.list(request('lider_auditor', fx.lider.id), undefined);
    const headers: Record<string, string> = {};
    const response = { set: (values: Record<string, string>) => Object.assign(headers, values) };

    const plan = await controller.planDocument(item.id, request('lider_auditor', fx.lider.id), response as never);
    const notification = await controller.notificationDocument(item.id, request('auditado', fx.auditado.id), response as never);

    expect(headers['Content-Disposition']).toContain('.docx');
    expect(plan.getStream()).toBeDefined();
    expect(notification.getStream()).toBeDefined();
  });

  it('una auditoría de otra organización responde no encontrada', async () => {
    const [item] = await controller.list(request('gestor_programa', fx.gestor.id), undefined);

    await expect(controller.detail(item.id, request('gestor_programa', fx.gestorAjeno.id, fx.otraOrganizacionId))).rejects.toThrow(
      'Auditoría no encontrada',
    );
    await expect(controller.reviewScope(item.id, {}, request('gestor_programa', fx.gestorAjeno.id, fx.otraOrganizacionId))).rejects.toThrow(
      'Auditoría no encontrada',
    );
  });
});

import { and, eq } from 'drizzle-orm';
import { auditoria, informacionDocumentada, informe, notificacion } from '@db/schema/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditFlowSeed, type AuditScenario } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { InformeApprovalService } from '@informes-services-informe/informe-approval.service.js';
import { InformeDistributionService } from '@informes-services-informe/informe-distribution.service.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';
import { InformeReviewService } from '@informes-services-informe/informe-review.service.js';

vi.setConfig({ testTimeout: 60000 });

describe('flujo de informes', () => {
  let database: TestDatabase;
  let loader: InformeLoaderService;
  let drafts: InformeDraftService;
  let review: InformeReviewService;
  let distribution: InformeDistributionService;
  let reader: InformeReadService;
  let approval: InformeApprovalService;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    loader = new InformeLoaderService(database.db);
    drafts = new InformeDraftService(database.db, loader, notifications, versions);
    review = new InformeReviewService(database.db, loader, versions);
    distribution = new InformeDistributionService(database.db, loader, notifications, versions);
    reader = new InformeReadService(database.db, loader, drafts, versions);
    approval = new InformeApprovalService(database.db, loader, notifications, versions);
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  const notificationsOf = async (usuarioId: string, tipo: string) =>
    database.db
      .select()
      .from(notificacion)
      .where(and(eq(notificacion.usuarioId, usuarioId), eq(notificacion.tipo, tipo)));

  it('genera el borrador solo si la auditoría está cerrada, una sola vez, y avisa al líder una vez', async () => {
    const enCurso = await AuditFlowSeed.create(database, 'en_curso');
    expect(await drafts.ensureFor(enCurso.auditoriaId, enCurso.organizacionId)).toBeNull();

    const s = await AuditFlowSeed.create(database);
    const first = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    const second = await drafts.ensureFor(s.auditoriaId, s.organizacionId);

    expect(first?.created).toBe(true);
    expect(second).toEqual({ informeId: first?.informeId, created: false });
    expect(await notificationsOf(s.lider.id, 'informe_borrador')).toHaveLength(1);

    const detail = await loader.detail(first!.informeId, s.organizacionId);
    expect(detail.estado).toBe('borrador');
    expect(detail.hallazgos).toHaveLength(2);
    expect(detail.criterios).toEqual(['ISO 9001:2015 8.4']);
    expect(detail.procesos).toEqual(['Compras']);
    expect(detail.equipo).toHaveLength(1);
    expect(detail.conclusiones).toContain('no conformidad');
    const versions = await database.db.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, detail.id));
    expect(versions).toHaveLength(1);
  });

  it('aísla los informes por organización', async () => {
    const a = await AuditFlowSeed.create(database);
    const b = await AuditFlowSeed.create(database);
    const draft = await drafts.ensureFor(a.auditoriaId, a.organizacionId);

    await expect(drafts.ensureFor(a.auditoriaId, b.organizacionId)).rejects.toThrow('Auditoría no encontrada');
    await expect(loader.detail(draft!.informeId, b.organizacionId)).rejects.toThrow('Informe no encontrado');
    await expect(review.updateConclusions(draft!.informeId, TokenFactory.of(b.lider), 'x')).rejects.toThrow('Informe no encontrado');
  });

  async function firmado(s: AuditScenario) {
    const draft = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    await review.updateConclusions(draft!.informeId, TokenFactory.of(s.lider), 'Conclusiones finales del líder');
    await review.sign(draft!.informeId, TokenFactory.of(s.lider), 'Ana Líder');
    return draft!.informeId;
  }

  it('el líder ajusta conclusiones, firma con huella y el informe queda bloqueado', async () => {
    const s = await AuditFlowSeed.create(database);
    const draft = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    const lider = TokenFactory.of(s.lider);

    await expect(review.updateConclusions(draft!.informeId, TokenFactory.of(s.gestor), 'x')).rejects.toThrow('líder');
    const saved = await review.updateConclusions(draft!.informeId, lider, 'Conclusiones finales del líder');
    expect(saved.conclusiones).toBe('Conclusiones finales del líder');

    const result = await review.sign(draft!.informeId, lider, 'Ana Líder');
    const detail = await loader.detail(draft!.informeId, s.organizacionId);
    expect(result.huella).toBe(detail.huellaActual);
    expect(detail.estado).toBe('firmado');
    expect(detail.firma?.huella).toBe(result.huella);
    expect(detail.fechaEmision).not.toBeNull();

    await expect(review.updateConclusions(draft!.informeId, lider, 'otro')).rejects.toThrow('no se puede modificar');
    await expect(review.sign(draft!.informeId, lider, 'Ana Líder')).rejects.toThrow('borrador');
    const versions = await database.db.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, draft!.informeId));
    expect(versions.length).toBeGreaterThanOrEqual(3);
  });

  it('no permite firmar con conclusiones vacías', async () => {
    const s = await AuditFlowSeed.create(database);
    const draft = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    await database.orm.update(informe).set({ conclusiones: null }).where(eq(informe.id, draft!.informeId));

    await expect(review.sign(draft!.informeId, TokenFactory.of(s.lider), 'Ana Líder')).rejects.toThrow('conclusiones');
    const withBody = await review.sign(draft!.informeId, TokenFactory.of(s.lider), 'Ana Líder', 'Conclusiones enviadas con la firma');
    expect(withBody.estado).toBe('firmado');
  });

  it('exige destinatario de dirección, finaliza la auditoría y notifica a los destinatarios', async () => {
    const s = await AuditFlowSeed.create(database);
    const informeId = await firmado(s);
    const lider = TokenFactory.of(s.lider);

    await expect(distribution.distribute(informeId, lider, [s.auditado.id, s.gestor.id])).rejects.toThrow('alta dirección');
    const [still] = await database.db.select().from(auditoria).where(eq(auditoria.id, s.auditoriaId));
    expect(still.estado).toBe('cerrada');

    const outsider = (await AuditFlowSeed.create(database)).admin;
    await expect(distribution.distribute(informeId, lider, [outsider.id, s.admin.id])).rejects.toThrow('no existe en su organización');

    const sent = await distribution.distribute(informeId, lider, [s.admin.id, s.auditado.id]);
    expect(sent.destinatarios).toBe(2);
    const [after] = await database.db.select().from(auditoria).where(eq(auditoria.id, s.auditoriaId));
    expect(after.estado).toBe('finalizada');
    expect(await notificationsOf(s.admin.id, 'informe_distribuido')).toHaveLength(1);
    expect((await loader.detail(informeId, s.organizacionId)).estado).toBe('distribuido');
    await expect(distribution.distribute(informeId, lider, [s.admin.id])).rejects.toThrow('ya fue distribuido');
  });

  it('no distribuye un borrador y solo el líder puede hacerlo', async () => {
    const s = await AuditFlowSeed.create(database);
    const draft = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    await expect(distribution.distribute(draft!.informeId, TokenFactory.of(s.lider), [s.admin.id])).rejects.toThrow('informe firmado');
    await expect(distribution.distribute(draft!.informeId, TokenFactory.of(s.gestor), [s.admin.id])).rejects.toThrow('líder');
  });

  it('ofrece candidatos de dirección, gestión y dueños de los procesos auditados', async () => {
    const s = await AuditFlowSeed.create(database);
    const draft = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    const detail = await loader.detail(draft!.informeId, s.organizacionId);
    const candidates = await distribution.candidates(detail);

    expect(candidates.map((item) => item.id).sort()).toEqual([s.admin.id, s.gestor.id, s.auditado.id].sort());
  });

  it('la dirección acusa recibo una sola vez y queda constancia; el dueño de proceso lee pero no acusa', async () => {
    const s = await AuditFlowSeed.create(database);
    const informeId = await firmado(s);
    const admin = TokenFactory.of(s.admin);
    const du = TokenFactory.of(s.auditado);

    await expect(reader.get(informeId, admin, 'direccion')).rejects.toThrow('No tiene acceso');
    await expect(reader.acknowledge(informeId, admin, 'direccion')).rejects.toThrow('ya distribuido');
    await distribution.distribute(informeId, TokenFactory.of(s.lider), [s.admin.id, s.auditado.id]);

    const read = await reader.get(informeId, admin, 'direccion');
    expect(read.conclusiones).toBe('Conclusiones finales del líder');
    expect((await reader.get(informeId, du, 'dueno_proceso')).id).toBe(informeId);
    await expect(reader.acknowledge(informeId, du, 'dueno_proceso')).rejects.toThrow('alta dirección');

    const first = await reader.acknowledge(informeId, admin, 'direccion');
    const second = await reader.acknowledge(informeId, admin, 'direccion');
    expect(first.yaRegistrado).toBe(false);
    expect(second).toMatchObject({ yaRegistrado: true, leidoEn: first.leidoEn });
    const detail = await loader.detail(informeId, s.organizacionId);
    const mine = detail.distribucion.find((item) => item.usuarioId === s.admin.id);
    expect(mine?.leido).toBe(true);
    expect(mine?.leidoEn).toBe(first.leidoEn);
    expect(detail.distribucion.find((item) => item.usuarioId === s.auditado.id)?.leido).toBe(false);
  });

  it('lista informes por auditoría creando el borrador de forma perezosa, según el rol', async () => {
    const s = await AuditFlowSeed.create(database);
    const lider = TokenFactory.of(s.lider);

    const list = await reader.list(lider, 'lider', s.auditoriaId);
    expect(list).toHaveLength(1);
    expect(list[0].estado).toBe('borrador');
    expect(await reader.list(TokenFactory.of(s.admin), 'direccion', s.auditoriaId)).toHaveLength(0);
    expect(await reader.list(TokenFactory.of(s.gestor), 'gestor')).toHaveLength(1);
  });

  it('la gestión aprueba un informe firmado una sola vez y se avisa al líder', async () => {
    const s = await AuditFlowSeed.create(database);
    const draft = await drafts.ensureFor(s.auditoriaId, s.organizacionId);
    const gestor = TokenFactory.of(s.gestor);

    await expect(approval.approve(draft!.informeId, gestor)).rejects.toThrow('firmado');
    await review.sign(draft!.informeId, TokenFactory.of(s.lider), 'Ana Líder');
    const approved = await approval.approve(draft!.informeId, gestor);
    expect(approved.aprobadoPorId).toBe(s.gestor.id);
    await expect(approval.approve(draft!.informeId, gestor)).rejects.toThrow('ya fue aprobado');
    expect(await notificationsOf(s.lider.id, 'informe_aprobado')).toHaveLength(1);
  });
});

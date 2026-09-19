import { and, eq } from 'drizzle-orm';
import { accion, hallazgo, informacionDocumentada, notificacion } from '@db/schema/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditFlowSeed, type AuditScenario } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { AccionClosureService } from '@acciones-services-accion/accion-closure.service.js';
import { AccionCreationService } from '@acciones-services-accion/accion-creation.service.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';
import { AccionVerificationService } from '@acciones-services-accion/accion-verification.service.js';

vi.setConfig({ testTimeout: 60000 });

const NOW = new Date('2026-05-10T12:00:00.000Z');
const PRUEBA = [{ nombre: 'acta-cierre.pdf', url: 'https://archivos.amoxa.test/acta-cierre.pdf' }];
const FORM = { correccion: 'Se evaluó a los proveedores', causa_raiz: 'No existía el procedimiento', fecha_limite: '2026-06-01' };

describe('flujo de acciones correctivas', () => {
  let database: TestDatabase;
  let creation: AccionCreationService;
  let closure: AccionClosureService;
  let verification: AccionVerificationService;
  let queries: AccionQueryService;
  let loader: AccionLoaderService;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    loader = new AccionLoaderService(database.db);
    creation = new AccionCreationService(database.db, notifications, versions);
    closure = new AccionClosureService(database.db, loader, notifications, versions);
    verification = new AccionVerificationService(database.db, loader, notifications, versions);
    queries = new AccionQueryService(database.db, loader);
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  const notificationsOf = async (usuarioId: string, tipo: string) =>
    database.db
      .select()
      .from(notificacion)
      .where(and(eq(notificacion.usuarioId, usuarioId), eq(notificacion.tipo, tipo)));

  const createAction = async (s: AuditScenario) =>
    (await creation.create(s.hallazgoNcId, TokenFactory.of(s.auditado), { ...FORM, responsable_id: s.auditado.id }, NOW)).id;

  it('el dueño del proceso crea la acción con todos los datos y ve los días que le quedan', async () => {
    const s = await AuditFlowSeed.create(database);
    const created = await creation.create(s.hallazgoNcId, TokenFactory.of(s.auditado), { ...FORM, responsable_id: s.auditado.id }, NOW);

    expect(created.diasRestantes).toBe(22);
    const detail = await loader.detail(created.id, s.organizacionId, NOW);
    expect(detail.estado).toBe('abierta');
    expect(detail.causaRaiz).toBe(FORM.causa_raiz);
    expect(detail.diasRestantes).toBe(22);
    const versions = await database.db.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, created.id));
    expect(versions).toHaveLength(1);
  });

  it('bloquea la creación en los casos no permitidos', async () => {
    const s = await AuditFlowSeed.create(database);
    const du = TokenFactory.of(s.auditado);
    const input = { ...FORM, responsable_id: s.auditado.id };

    await expect(creation.create(s.hallazgoNcId, du, { ...input, fecha_limite: '2026-05-01' }, NOW)).rejects.toThrow('pasado');
    await expect(creation.create(s.hallazgoOmId, du, input, NOW)).rejects.toThrow('no conformidad');
    await expect(creation.create(s.hallazgoNcId, du, { ...input, responsable_id: s.gestor.id }, NOW)).rejects.toThrow('responsable');
    await expect(creation.create(s.hallazgoNcId, TokenFactory.of(s.gestor), input, NOW)).rejects.toThrow('dueño del proceso');
    const other = await AuditFlowSeed.create(database);
    await expect(creation.create(s.hallazgoNcId, TokenFactory.of(other.auditado), input, NOW)).rejects.toThrow('Hallazgo no encontrado');

    await creation.create(s.hallazgoNcId, du, input, NOW);
    await expect(creation.create(s.hallazgoNcId, du, input, NOW)).rejects.toThrow('en curso');
  });

  it('sin prueba no se puede reportar el cierre; con prueba avisa a los verificadores', async () => {
    const s = await AuditFlowSeed.create(database);
    const id = await createAction(s);
    const du = TokenFactory.of(s.auditado);

    await expect(closure.report(id, du, { evidencias: [] }, NOW)).rejects.toThrow('prueba');
    await expect(closure.report(id, TokenFactory.of(s.gestor), { evidencias: PRUEBA }, NOW)).rejects.toThrow('responsable');

    const result = await closure.report(id, du, { evidencias: PRUEBA, comentario_cierre: 'Listo' }, NOW);
    expect(result.estado).toBe('reportada');
    expect((await loader.detail(id, s.organizacionId, NOW)).estado).toBe('reportada');
    expect(await notificationsOf(s.auditor.id, 'accion_por_verificar')).toHaveLength(1);
    const [finding] = await database.db.select().from(hallazgo).where(eq(hallazgo.id, s.hallazgoNcId));
    expect(finding.estado).toBe('en_verificacion');
    await expect(closure.report(id, du, { evidencias: PRUEBA }, NOW)).rejects.toThrow('ya fue reportada');
  });

  it('el auditor declara eficaz con evidencia y se cierra la no conformidad', async () => {
    const s = await AuditFlowSeed.create(database);
    const id = await createAction(s);
    await closure.report(id, TokenFactory.of(s.auditado), { evidencias: PRUEBA }, NOW);
    const auditor = TokenFactory.of(s.auditor);

    await expect(verification.verify(id, auditor, { evidencias: [] }, NOW)).rejects.toThrow('evidencia');
    const result = await verification.verify(id, auditor, { evidencias: PRUEBA, comentario: 'Eficaz' }, NOW);

    expect(result).toMatchObject({ eficaz: true, estado: 'verificada', hallazgoEstado: 'cerrado' });
    const [finding] = await database.db.select().from(hallazgo).where(eq(hallazgo.id, s.hallazgoNcId));
    expect(finding.estado).toBe('cerrado');
    expect(await notificationsOf(s.auditado.id, 'accion_verificada')).toHaveLength(1);
    await expect(verification.verify(id, auditor, { evidencias: PRUEBA }, NOW)).rejects.toThrow('reportada');
  });

  it('si no fue eficaz se reabre con nueva fecha y puede volver a reportarse', async () => {
    const s = await AuditFlowSeed.create(database);
    const id = await createAction(s);
    const du = TokenFactory.of(s.auditado);
    const auditor = TokenFactory.of(s.auditor);
    await closure.report(id, du, { evidencias: PRUEBA }, NOW);

    await expect(verification.reopen(id, auditor, { evidencias: PRUEBA }, NOW)).rejects.toThrow('nueva fecha');
    await expect(verification.reopen(id, auditor, { evidencias: PRUEBA, nueva_fecha: '2026-05-01' }, NOW)).rejects.toThrow('pasado');
    const reopened = await verification.reopen(id, auditor, { evidencias: PRUEBA, nueva_fecha: '2026-07-01' }, NOW);

    expect(reopened).toMatchObject({ eficaz: false, estado: 'reabierta', fechaLimite: '2026-07-01' });
    const detail = await loader.detail(id, s.organizacionId, NOW);
    expect(detail.estado).toBe('reabierta');
    expect(detail.ciclo).toBe(2);
    const [finding] = await database.db.select().from(hallazgo).where(eq(hallazgo.id, s.hallazgoNcId));
    expect(finding.estado).toBe('abierto');
    expect(await notificationsOf(s.auditado.id, 'accion_reabierta')).toHaveLength(1);

    await closure.report(id, du, { evidencias: PRUEBA }, NOW);
    expect((await loader.detail(id, s.organizacionId, NOW)).estado).toBe('reportada');
    await verification.verify(id, auditor, { evidencias: PRUEBA, eficaz: false, nueva_fecha: '2026-08-01' }, NOW);
    expect((await loader.detail(id, s.organizacionId, NOW)).reaperturas).toBe(2);
  });

  it('un auditor no verifica una acción de la que es responsable', async () => {
    const s = await AuditFlowSeed.create(database);
    const id = await createAction(s);
    await database.orm.update(accion).set({ responsableId: s.auditor.id }).where(eq(accion.id, id));
    await database.orm.update(accion).set({ estado: 'completada', fechaCierre: '2026-05-09' }).where(eq(accion.id, id));

    await expect(verification.verify(id, TokenFactory.of(s.auditor), { evidencias: PRUEBA }, NOW)).rejects.toThrow('responsable');
    expect(await queries.list(TokenFactory.of(s.auditor), 'auditor', {}, NOW)).toHaveLength(0);
  });

  it('las listas dependen del rol y respetan la organización', async () => {
    const s = await AuditFlowSeed.create(database);
    const id = await createAction(s);
    const other = await AuditFlowSeed.create(database);

    expect(await queries.list(TokenFactory.of(s.auditado), 'dueno_proceso', {}, NOW)).toHaveLength(1);
    expect(await queries.list(TokenFactory.of(s.gestor), 'gestor', {}, NOW)).toHaveLength(1);
    expect(await queries.list(TokenFactory.of(s.auditor), 'auditor', {}, NOW)).toHaveLength(0);
    expect(await queries.list(TokenFactory.of(other.gestor), 'gestor', {}, NOW)).toHaveLength(0);
    expect(await queries.list(TokenFactory.of(other.auditado), 'dueno_proceso', {}, NOW)).toHaveLength(0);

    await closure.report(id, TokenFactory.of(s.auditado), { evidencias: PRUEBA }, NOW);
    expect(await queries.list(TokenFactory.of(s.auditor), 'auditor', {}, NOW)).toHaveLength(1);
    expect(await queries.list(TokenFactory.of(s.gestor), 'gestor', { estado: 'abierta' }, NOW)).toHaveLength(0);

    await expect(queries.get(id, TokenFactory.of(other.gestor), 'gestor', NOW)).rejects.toThrow('Acción no encontrada');
    await expect(queries.get(id, TokenFactory.of(other.auditado), 'dueno_proceso', NOW)).rejects.toThrow('Acción no encontrada');
    await expect(queries.get(id, TokenFactory.of(s.lider), 'lider', NOW)).rejects.toThrow('No tiene acceso');
  });
});

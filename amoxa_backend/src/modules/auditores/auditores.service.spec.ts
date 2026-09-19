import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { auditor, evaluacionAuditor, evaluacionCompetencia, informacionDocumentada, notificacion } from '@db/schema/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditorFichaSchema } from '@validators-auditores/auditor-ficha.schema.js';
import { EvaluacionBodySchema } from '@validators-auditores-evaluacion/evaluacion-body.schema.js';
import { AuditorDocumentService } from '@auditores-services-auditor/auditor-document.service.js';
import { AuditorQueryService } from '@auditores-services-auditor/auditor-query.service.js';
import { AuditoresService } from '@auditores-services/auditores.service.js';
import { AuditorScreenDataProvider } from '@auditores-screens/auditor-screen-data.provider.js';
import { AuditorMapper } from '@auditores-mappers-auditor/auditor-mapper.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { AuditFlowSeed, type AuditScenario } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';

const token = (user: SeededUser): TokenPayload => ({
  sub: user.id,
  organizacionId: user.organizacionId,
  email: `${user.rol}@amoxa.test`,
  rol: user.rol,
  issuedAt: '2026-01-01T00:00:00.000Z',
});

const evaluacion = (data: Record<string, unknown>) =>
  EvaluacionBodySchema.parse({ evaluacion: data }) as Parameters<AuditoresService['registerEvaluation']>[2];
const ficha = (data: Record<string, unknown>) => AuditorFichaSchema.parse({ auditor: data }) as Parameters<AuditoresService['updateFicha']>[2];

describe('AuditoresService', () => {
  let database: TestDatabase;
  let scenario: AuditScenario;
  let service: AuditoresService;
  let query: AuditorQueryService;
  let gestor: TokenPayload;
  let auditorToken: TokenPayload;
  let novato: SeededUser;
  let otroGestor: TokenPayload;

  beforeAll(async () => {
    database = await TestDatabase.create();
    scenario = await AuditFlowSeed.create(database);
    gestor = token(scenario.gestor);
    auditorToken = token(scenario.auditor);
    novato = await TestSeed.usuario(database, scenario.organizacionId, 'auditor');
    const otra = await TestSeed.organizacion(database, 'Otra organización');
    otroGestor = token(await TestSeed.usuario(database, otra, 'gestor_programa'));
    query = new AuditorQueryService(database.db);
    service = new AuditoresService(database.db, query, new RecordVersionService(database.db), new NotificationService(database.db));
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('lista los auditores de la organización, incluidos los que aún no tienen ficha', async () => {
    const records = await query.list(scenario.organizacionId);

    expect(records.map((record) => record.id).sort()).toEqual([scenario.auditor.id, novato.id, scenario.lider.id].sort());
    const withoutFile = records.find((record) => record.id === novato.id)!;
    expect(withoutFile.estado).toBeNull();
    expect(AuditorMapper.toSummary(withoutFile).estado).toBe('formacion');
    expect(await query.list(otroGestor.organizacionId)).toEqual([]);
  });

  it('el gestor edita la ficha y se crea el registro del auditor con su versión', async () => {
    const view = await service.updateFicha(
      novato.id,
      gestor,
      ficha({ formacion: 'Ingeniería industrial', experiencia: '3 años', especialidades: 'ISO 9001, Compras\nVentas' }),
    );

    expect(view.formacion).toBe('Ingeniería industrial');
    expect(view.disciplinas).toEqual(['ISO 9001', 'Compras', 'Ventas']);
    expect(view.especialidades).toBe('ISO 9001, Compras, Ventas');
    expect(view.estado).toBe('formacion');
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, novato.id));
    expect(versions).toHaveLength(1);
    expect(versions[0].creadoPorId).toBe(gestor.sub);
  });

  it('exige al menos dos métodos distintos de evaluación', async () => {
    await expect(service.registerEvaluation(novato.id, gestor, evaluacion({ metodos: ['examen'], resultado: 'satisfactorio' }))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(
      service.registerEvaluation(novato.id, gestor, evaluacion({ metodos: ['examen', 'examen'], resultado: 'satisfactorio' })),
    ).rejects.toThrow('al menos dos métodos');
    expect(await database.orm.select().from(evaluacionAuditor).where(eq(evaluacionAuditor.auditorId, novato.id))).toHaveLength(0);
  });

  it('una evaluación satisfactoria deja al auditor apto con vigencia de 12 meses, registra los métodos y avisa', async () => {
    const result = await service.registerEvaluation(
      novato.id,
      gestor,
      evaluacion({ metodos: ['entrevista', 'observacion', 'examen'], resultado: 'satisfactorio', fecha: '2026-03-31', observaciones: 'Buen desempeño' }),
    );

    expect(result.auditor.estado).toBe('apto');
    expect(result.auditor.vigencia_hasta).toBe('2027-03-31');
    expect(result.evaluacion.metodos_etiquetas).toEqual(expect.arrayContaining(['Entrevista', 'Observación en campo', 'Examen']));
    expect(result.evaluacion.evaluador).toBe('Usuario gestor_programa');
    const methods = await database.orm.select().from(evaluacionCompetencia).where(eq(evaluacionCompetencia.evaluacionId, result.evaluacion.id));
    expect(methods).toHaveLength(3);
    const [stored] = await database.orm.select().from(auditor).where(eq(auditor.usuarioId, novato.id));
    expect(stored).toMatchObject({ estado: 'apto', vigenciaHasta: '2027-03-31' });
    const notices = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, novato.id));
    expect(notices.some((notice) => notice.tipo === 'auditor_evaluado')).toBe(true);
    const evaluationVersions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, result.evaluacion.id));
    expect(evaluationVersions).toHaveLength(1);
  });

  it('una evaluación no satisfactoria retira la aptitud de un auditor apto', async () => {
    const result = await service.registerEvaluation(
      novato.id,
      gestor,
      evaluacion({ metodos: ['revision_registros', 'testimonios'], resultado: 'no_satisfactorio', fecha: '2026-09-01' }),
    );

    expect(result.auditor.estado).toBe('no_apto');
    expect(result.auditor.vigencia_hasta).toBeNull();
    expect(result.auditor.evaluaciones).toHaveLength(2);
    expect(result.auditor.evaluaciones[0].fecha).toBe('2026-09-01');
  });

  it('un auditor en formación que no aprueba sigue en formación', async () => {
    const result = await service.registerEvaluation(
      scenario.lider.id,
      gestor,
      evaluacion({ metodos: ['examen', 'entrevista'], resultado: 'no_satisfactorio' }),
    );

    expect(result.auditor.estado).toBe('formacion');
  });

  it('otra organización recibe 404 y los usuarios que no son auditores no se evalúan', async () => {
    await expect(
      service.registerEvaluation(novato.id, otroGestor, evaluacion({ metodos: ['examen', 'entrevista'], resultado: 'satisfactorio' })),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateFicha(novato.id, otroGestor, ficha({ formacion: 'x' }))).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.registerEvaluation(scenario.gestor.id, gestor, evaluacion({ metodos: ['examen', 'entrevista'], resultado: 'satisfactorio' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('datos de pantalla', () => {
    let provider: AuditorScreenDataProvider;

    beforeAll(() => {
      provider = new AuditorScreenDataProvider(query, new RecordVersionService(database.db));
    });

    it('auditor.lista entrega el estado y la vigencia de cada auditor', async () => {
      const result = await provider.load({ screenId: 'auditor.lista', user: gestor, role: 'gestor' });

      const items = (result.data as { auditores: { id: string; description: string; status: string }[] }).auditores;
      expect(items).toHaveLength(3);
      expect(items.find((item) => item.id === novato.id)).toMatchObject({ status: 'No apto', description: 'No apto' });
      expect(result.offline?.enabled).toBe(true);
    });

    it('auditor.ficha para el gestor con entidad muestra los datos editables y la versión', async () => {
      const result = await provider.load({ screenId: 'auditor.ficha', user: gestor, role: 'gestor', entityId: novato.id });

      expect(result.entity).toMatchObject({ type: 'auditor', id: novato.id, estado: 'no_apto' });
      expect((result.entity as { version: number }).version).toBeGreaterThanOrEqual(3);
      expect((result.data as { auditor: Record<string, string> }).auditor).toMatchObject({
        formacion: 'Ingeniería industrial',
        especialidades: 'ISO 9001, Compras, Ventas',
        vigencia_hasta: '',
      });
    });

    it('auditor.ficha para el auditor siempre es la suya, aunque pida otra', async () => {
      const own = await provider.load({ screenId: 'auditor.ficha', user: auditorToken, role: 'auditor', entityId: scenario.auditor.id });
      const noEntity = await provider.load({ screenId: 'auditor.ficha', user: auditorToken, role: 'auditor' });

      expect(own.entity).toMatchObject({ id: scenario.auditor.id, estado: 'apto' });
      expect(noEntity.entity).toMatchObject({ id: scenario.auditor.id });
      const stranger = await provider.load({ screenId: 'auditor.ficha', user: token(novato), role: 'auditor', entityId: scenario.auditor.id });
      expect(stranger.entity).toMatchObject({ id: novato.id });
    });

    it('auditor.evaluacion entrega el dictamen actual y el id de la última evaluación', async () => {
      const result = await provider.load({ screenId: 'auditor.evaluacion', user: gestor, role: 'gestor', entityId: novato.id });

      const data = result.data as { auditor: Record<string, string>; evaluacion: { metodos: string[]; ultima_id: string } };
      expect(data.auditor.apto).toBe('No apto');
      expect(data.evaluacion.metodos).toEqual([]);
      expect(data.evaluacion.ultima_id).not.toBe('');
    });

    it('sin entidad el gestor recibe datos vacíos', async () => {
      const result = await provider.load({ screenId: 'auditor.evaluacion', user: gestor, role: 'gestor' });

      expect(result.entity).toBeUndefined();
      expect((result.data as { evaluacion: { ultima_id: string } }).evaluacion.ultima_id).toBe('');
    });
  });

  describe('documentos .docx', () => {
    it('genera la ficha del auditor con formación, competencia e historial', async () => {
      const documents = new AuditorDocumentService(database.db, query);

      const file = await documents.fichaDocument(novato.id, gestor.organizacionId, 'gestor', gestor.sub);
      const text = await DocxInspector.text(file.buffer);

      expect(text).toContain('Ficha de auditor');
      expect(text).toContain('Ingeniería industrial');
      expect(text).toContain('No apto');
      expect(text).toContain('Revisión de registros');
      expect(text).toContain('Vigente hasta');
    });

    it('genera el registro de evaluación con métodos, resultado, aptitud, vigencia y firmas', async () => {
      const documents = new AuditorDocumentService(database.db, query);
      const [passed] = await database.orm.select().from(evaluacionAuditor).where(eq(evaluacionAuditor.resultado, 'satisfactorio'));

      const file = await documents.evaluationDocument(novato.id, passed.id, gestor.organizacionId, 'gestor', gestor.sub);
      const text = await DocxInspector.text(file.buffer);

      expect(text).toContain('Registro de evaluación de competencia');
      expect(text).toContain('Entrevista');
      expect(text).toContain('Satisfactorio');
      expect(text).toContain('2027-03-31');
      expect(text).toContain('Evaluador (gestor del programa)');
    });

    it('respeta la organización y la regla de que el auditor solo ve lo suyo', async () => {
      const documents = new AuditorDocumentService(database.db, query);
      const [evaluation] = await database.orm.select().from(evaluacionAuditor).where(eq(evaluacionAuditor.auditorId, novato.id));

      await expect(documents.fichaDocument(novato.id, otroGestor.organizacionId, 'gestor', otroGestor.sub)).rejects.toBeInstanceOf(NotFoundException);
      await expect(documents.fichaDocument(scenario.auditor.id, gestor.organizacionId, 'auditor', novato.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        documents.evaluationDocument(scenario.auditor.id, evaluation.id, gestor.organizacionId, 'gestor', gestor.sub),
      ).rejects.toBeInstanceOf(NotFoundException);
      const own = await documents.fichaDocument(novato.id, gestor.organizacionId, 'auditor', novato.id);
      expect(own.buffer.subarray(0, 2).toString()).toBe('PK');
    });
  });
});

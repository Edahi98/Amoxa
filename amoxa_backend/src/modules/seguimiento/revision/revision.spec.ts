import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { informacionDocumentada, leccionAprendida, notificacion, programaAuditoria, revisionDireccion } from '@db/schema/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { SeguimientoFixture } from '@testing/seguimiento/seguimiento-fixture.js';
import { ReviewMinutesDocx } from '@docx-seguimiento/review-minutes.docx.js';
import { IndicatorQuery } from '@seguimiento-indicadores-indicator/indicator-query.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';
import { ProgramLoader } from '@seguimiento-revision-program/program-loader.js';
import { ProgramReviewController } from '@seguimiento-revision-program/program-review.controller.js';
import { ProgramReviewService } from '@seguimiento-revision-program/program-review.service.js';
import { ReviewMinutesService } from '@seguimiento-revision-review/review-minutes.service.js';
import { RevisionDireccionController } from '@seguimiento-revision/revision-direccion.controller.js';
import { RevisionDireccionDataProvider } from '@seguimiento-revision/revision-direccion-data.provider.js';
import { RevisionDireccionService } from '@seguimiento-revision/revision-direccion.service.js';
import { RevisionProgramaDataProvider } from '@seguimiento-revision/revision-programa-data.provider.js';
import { LessonSchema } from '@validators-seguimiento/lesson.schema.js';
import { NextPeriodSchema } from '@validators-seguimiento/next-period.schema.js';
import { ReviewDecisionSchema } from '@validators-seguimiento/review-decision.schema.js';

describe('Revisión por la dirección y revisión del programa', () => {
  let database: TestDatabase;
  let revision: RevisionDireccionService;
  let review: ProgramReviewService;
  let minutes: ReviewMinutesService;
  let organizacionId: string;
  let otraOrganizacionId: string;
  let gestorId: string;
  let direccionId: string;
  let otroGestorId: string;
  let programaId: string;
  let borradorId: string;

  const gestor = () => new FakeRequest('gestor_programa', gestorId, organizacionId).user!;
  const direccion = () => new FakeRequest('admin', direccionId, organizacionId).user!;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const fixture = new SeguimientoFixture(database);
    organizacionId = await TestSeed.organizacion(database, 'Amoxa Demo');
    otraOrganizacionId = await TestSeed.organizacion(database, 'Otra');
    gestorId = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
    direccionId = (await TestSeed.usuario(database, organizacionId, 'admin')).id;
    otroGestorId = (await TestSeed.usuario(database, otraOrganizacionId, 'gestor_programa')).id;
    programaId = await fixture.programa(organizacionId, '2026', 'en_ejecucion');
    borradorId = await fixture.programa(organizacionId, '2028', 'borrador');
    const auditoria = await fixture.auditoria(programaId, gestorId, 'cerrada');
    const proceso = await fixture.proceso(organizacionId, gestorId, 'Compras');
    await fixture.hallazgo(auditoria, proceso, gestorId, 'NC');

    const loader = new ProgramLoader(database.db);
    const indicators = new IndicatorsService(new IndicatorQuery(database.db));
    const versions = new RecordVersionService(database.db);
    const notifications = new NotificationService(database.db);
    revision = new RevisionDireccionService(database.db, loader, indicators, versions, notifications);
    review = new ProgramReviewService(database.db, loader, versions);
    minutes = new ReviewMinutesService(database.db, loader, revision);
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('la dirección no puede decidir antes de que el gestor presente el resumen', async () => {
    await expect(revision.decide(direccion(), programaId, { decisiones: 'Aprobar recursos' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('el gestor presenta el resumen: queda registrado, versionado, confidencial y se avisa a la dirección', async () => {
    const result = await revision.present(gestor(), programaId);

    expect(result.version).toBe(1);
    const rows = await database.orm.select().from(revisionDireccion).where(eq(revisionDireccion.programaId, programaId));
    expect(rows).toHaveLength(1);
    expect(rows[0].tipo).toBe('presentacion');
    expect(rows[0].resumen).toContain('periodo 2026');
    const versions = await database.orm
      .select()
      .from(informacionDocumentada)
      .where(eq(informacionDocumentada.entidadId, programaId));
    expect(versions[0].entidadTipo).toBe('revision_direccion');
    expect(versions[0].confidencialidad).toBe('confidencial');
    expect(versions[0].hash).toHaveLength(64);
    const avisos = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, direccionId));
    expect(avisos.map((row) => row.tipo)).toContain('revision_direccion_presentada');
  });

  it('la dirección registra decisiones y recursos; cada registro se conserva y se avisa al gestor', async () => {
    const first = await revision.decide(direccion(), programaId, { decisiones: 'Ampliar el equipo auditor', recursos: '2 auditores' });
    const second = await revision.decide(direccion(), programaId, { decisiones: 'Revisar plazos' });

    expect(first.version).toBe(2);
    expect(second.version).toBe(3);
    const view = await revision.view(gestor(), programaId);
    expect(view.decisiones.map((item) => item.decisiones)).toEqual(['Ampliar el equipo auditor', 'Revisar plazos']);
    expect(view.decisiones[0].recursos).toBe('2 auditores');
    expect(view.presentaciones).toHaveLength(1);
    expect(view.revision.resumen).toContain('1 incumplimientos registrados');
    const avisos = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, gestorId));
    expect(avisos.map((row) => row.tipo)).toContain('revision_direccion_decidida');
  });

  it('rechaza programas aún no aprobados y programas de otra organización', async () => {
    const otro = new FakeRequest('gestor_programa', otroGestorId, otraOrganizacionId).user!;

    await expect(revision.present(gestor(), borradorId)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(revision.view(otro, programaId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(review.registerLessons(otro, programaId, { lecciones: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registra lecciones aprendidas sin borrar las anteriores', async () => {
    await review.registerLessons(gestor(), programaId, { lecciones: 'Planificar con más holgura' });
    const result = await review.registerLessons(gestor(), programaId, { lecciones: 'Capacitar a los dueños de proceso' });

    expect(result.version).toBe(2);
    const rows = await database.orm.select().from(leccionAprendida).where(eq(leccionAprendida.programaId, programaId));
    expect(rows).toHaveLength(2);
  });

  it('crea el programa del siguiente periodo como borrador copiando objetivos, frecuencia y métodos', async () => {
    const created = await review.createNext(gestor(), programaId, { periodo: '2027' });

    expect(created).toMatchObject({ periodo: '2027', estado: 'borrador', version: 1, origenId: programaId });
    const [row] = await database.orm.select().from(programaAuditoria).where(eq(programaAuditoria.id, created.id));
    expect(row.objetivos).toBe('Objetivos 2026');
    expect(row.frecuencia).toBe('anual');
    expect(row.metodos).toBe('mixto');
    expect(row.organizacionId).toBe(organizacionId);
    expect(row.creadoPorId).toBe(gestorId);
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, created.id));
    expect(versions).toHaveLength(1);
  });

  it('no crea el siguiente periodo repetido, igual al actual o desde un borrador', async () => {
    await expect(review.createNext(gestor(), programaId, { periodo: '2027' })).rejects.toBeInstanceOf(ConflictException);
    await expect(review.createNext(gestor(), programaId, { periodo: '2026' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(review.createNext(gestor(), borradorId, { periodo: '2029' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('el acta docx incluye entradas, decisiones, recursos, lecciones y firmas', async () => {
    const data = await minutes.data(direccion(), programaId);
    const file = await ReviewMinutesDocx.build(data);
    const text = await DocxInspector.text(file.buffer);

    expect(text).toContain('Acta de revisión por la dirección');
    expect(text).toContain('cláusula 9.3');
    expect(text).toContain('Ampliar el equipo auditor');
    expect(text).toContain('2 auditores');
    expect(text).toContain('Planificar con más holgura');
    expect(text).toContain('Alta dirección');
    expect(text).toContain('Gestor del programa');
  });

  it('entrega los datos de pantalla con la entidad del programa', async () => {
    const request = { screenId: 'revision.direccion', user: direccion(), role: 'direccion' as const, entityId: programaId };
    const direccionData = await new RevisionDireccionDataProvider(new ProgramLoader(database.db), revision).load(request);
    const programaData = await new RevisionProgramaDataProvider(new ProgramLoader(database.db), revision).load({
      ...request,
      screenId: 'revision.programa',
      role: 'gestor',
    });

    expect(direccionData.entity).toMatchObject({ type: 'programa', id: programaId, estado: 'en_ejecucion' });
    expect((direccionData.data?.indicadores as { auditorias_realizadas: number }).auditorias_realizadas).toBe(1);
    expect(direccionData.data?.revision).toMatchObject({ decisiones: '', recursos: '' });
    expect(programaData.data?.revision).toEqual({ lecciones: '' });
    expect(programaData.data?.siguiente).toEqual({ periodo: '' });
  });

  it('sin entidad usa el programa más reciente de la organización', async () => {
    const data = await new RevisionDireccionDataProvider(new ProgramLoader(database.db), revision).load({
      screenId: 'revision.direccion',
      user: direccion(),
      role: 'direccion',
    });

    expect(data.entity?.type).toBe('programa');
  });

  it('protege las rutas con los permisos de revisión', () => {
    expect(RouteGuardInspector.unprotected(RevisionDireccionController)).toEqual([]);
    expect(RouteGuardInspector.unprotected(ProgramReviewController)).toEqual([]);
    for (const route of ['view', 'minutesDocument', 'present', 'decide']) {
      expect(RouteGuardInspector.guardsOf(RevisionDireccionController, route)).toContain('PermissionsGuard');
    }
    expect(RouteGuardInspector.guardsOf(ProgramReviewController, 'lessons')).toContain('PermissionsGuard');
    expect(RouteGuardInspector.guardsOf(ProgramReviewController, 'next')).toContain('PermissionsGuard');
  });

  it('valida los cuerpos aceptando campos directos o anidados del contexto y rechazando inyección', () => {
    expect(ReviewDecisionSchema.safeParse({ revision: { decisiones: 'Aprobar', recursos: '' }, otro: 1 }).data).toEqual({ decisiones: 'Aprobar' });
    expect(ReviewDecisionSchema.safeParse({ decisiones: '' }).success).toBe(false);
    expect(ReviewDecisionSchema.safeParse({ decisiones: '<script>alert(1)</script>' }).success).toBe(false);
    expect(LessonSchema.safeParse({ revision: { lecciones: 'Mejorar' } }).data).toEqual({ lecciones: 'Mejorar' });
    expect(LessonSchema.safeParse({}).success).toBe(false);
    expect(NextPeriodSchema.safeParse({ siguiente: { periodo: '2027' } }).data).toEqual({ periodo: '2027' });
    expect(NextPeriodSchema.safeParse({ periodo: '2027 drop table x' }).success).toBe(false);
  });
});

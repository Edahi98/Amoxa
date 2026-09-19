import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { informacionDocumentada, notificacion, proceso, programaAuditoria, programaProceso } from '@db/schema/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { ProgramaBodySchema, type ProgramaBody } from '@validators-programas/programa-body.schema.js';
import { ProgramaDocumentService } from '@programas-services-programa/programa-document.service.js';
import { ProgramaQueryService } from '@programas-services-programa/programa-query.service.js';
import { ProgramasService } from '@programas-services/programas.service.js';
import { ProgramaScreenDataProvider } from '@programas-screens/programa-screen-data.provider.js';
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

const body = (data: Record<string, unknown>): ProgramaBody => ProgramaBodySchema.parse({ programa: data }) as ProgramaBody;

describe('ProgramasService', () => {
  let database: TestDatabase;
  let scenario: AuditScenario;
  let service: ProgramasService;
  let query: ProgramaQueryService;
  let gestor: TokenPayload;
  let direccion: TokenPayload;
  let otroGestor: TokenPayload;
  let ventasId: string;

  const complete = {
    periodo: '2027',
    objetivos: 'Verificar la conformidad del SGC',
    riesgos: 'Dependencia de proveedores',
    fecha_inicio: '2027-01-15',
    fecha_fin: '2027-11-30',
  };

  beforeAll(async () => {
    database = await TestDatabase.create();
    scenario = await AuditFlowSeed.create(database);
    query = new ProgramaQueryService(database.db);
    service = new ProgramasService(database.db, query, new RecordVersionService(database.db), new NotificationService(database.db));
    gestor = token(scenario.gestor);
    direccion = token(scenario.admin);
    const otra = await TestSeed.organizacion(database, 'Otra organización');
    otroGestor = token(await TestSeed.usuario(database, otra, 'gestor_programa'));
    const [ventas] = await database.orm
      .insert(proceso)
      .values({
        organizacionId: scenario.organizacionId,
        nombre: 'Ventas',
        duenoUsuarioId: scenario.auditado.id,
        importancia: 'baja',
        nivelRiesgo: 1,
      })
      .returning({ id: proceso.id });
    ventasId = ventas.id;
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('crea un borrador con la prioridad y la frecuencia sugeridas por el sistema', async () => {
    const created = await service.create(gestor, body({ periodo: '2027' }));

    expect(created.estado).toBe('borrador');
    expect(created.procesos_prioritarios).toEqual([scenario.procesoId, ventasId]);
    expect(created.procesos[0].puntaje_sugerido).toBeGreaterThan(created.procesos[1].puntaje_sugerido);
    expect(created.frecuencia).toBe('Anual');
    expect(created.prioridad_modificada).toBe(false);
    expect(created.creado_por).toBe('Usuario gestor_programa');
    const versions = await database.orm
      .select()
      .from(informacionDocumentada)
      .where(eq(informacionDocumentada.entidadId, created.id));
    expect(versions).toHaveLength(1);
    expect(versions[0].creadoPorId).toBe(gestor.sub);
  });

  it('no permite dos programas para el mismo periodo ni crear sin periodo', async () => {
    await expect(service.create(gestor, body({ periodo: '2026' }))).rejects.toBeInstanceOf(ConflictException);
    await expect(service.create(gestor, body({ objetivos: 'Sin periodo' }))).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('edita un borrador, incrementa la versión y registra cada cambio', async () => {
    const [draft] = await query.list(scenario.organizacionId, 'gestor').then((rows) => rows.filter((row) => row.periodo === '2027'));
    const updated = await service.update(draft.id, gestor, body({ ...complete, fecha_fin: '2027-12-15' }));

    expect(updated.objetivos).toBe(complete.objetivos);
    expect(updated.fecha_fin).toBe('2027-12-15');
    expect(updated.version).toBe(draft.version + 1);
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, draft.id));
    expect(versions).toHaveLength(2);
  });

  it('bloquea el envío con datos incompletos y explica qué falta', async () => {
    const created = await service.create(gestor, body({ periodo: '2028', objetivos: 'Solo objetivos' }));

    const attempt = service.send(created.id, gestor, body({}));

    await expect(attempt).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(attempt).rejects.toThrow(/riesgos/);
    expect((await query.find(created.id, scenario.organizacionId, 'gestor')).estado).toBe('borrador');
  });

  it('exige justificación cuando se cambia la prioridad sugerida', async () => {
    const created = await service.create(gestor, body({ ...complete, periodo: '2029', fecha_inicio: '2029-01-01', fecha_fin: '2029-12-01' }));

    const attempt = service.send(created.id, gestor, body({ procesos_prioritarios: [ventasId, scenario.procesoId] }));
    await expect(attempt).rejects.toThrow(/justificación/);

    const sent = await service.send(
      created.id,
      gestor,
      body({ procesos_prioritarios: [ventasId, scenario.procesoId], justificacion_prioridad: 'Ventas tuvo cambios de personal' }),
    );
    expect(sent.estado).toBe('pendiente_aprobacion');
    expect(sent.prioridad_modificada).toBe(true);
    expect(sent.procesos_prioritarios).toEqual([ventasId, scenario.procesoId]);
  });

  it('rechaza procesos de otra organización', async () => {
    const [foreign] = await database.orm.select().from(proceso).limit(1);
    const created = await service.create(otroGestor, body({ periodo: '2027' }));

    await expect(service.update(created.id, otroGestor, body({ procesos_prioritarios: [foreign.id] }))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('cambiar los procesos retira sin borrar y reactiva al volver a incluirlos', async () => {
    const created = await service.create(gestor, body({ periodo: '2039' }));
    const rows = () => database.orm.select().from(programaProceso).where(eq(programaProceso.programaId, created.id));

    const reduced = await service.update(created.id, gestor, body({ procesos_prioritarios: [ventasId] }));

    expect(reduced.procesos_prioritarios).toEqual([ventasId]);
    const afterRetire = await rows();
    expect(afterRetire).toHaveLength(2);
    expect(afterRetire.find((row) => row.procesoId === scenario.procesoId)?.retiradoEn).toBeInstanceOf(Date);
    expect(afterRetire.find((row) => row.procesoId === ventasId)?.retiradoEn).toBeNull();
    expect((await query.processes(created.id)).map((item) => item.procesoId)).toEqual([ventasId]);

    const restored = await service.update(created.id, gestor, body({ procesos_prioritarios: [scenario.procesoId, ventasId] }));

    expect(restored.procesos_prioritarios).toEqual([scenario.procesoId, ventasId]);
    const afterRestore = await rows();
    expect(afterRestore).toHaveLength(2);
    expect(afterRestore.every((row) => row.retiradoEn === null)).toBe(true);
  });

  describe('flujo de aprobación', () => {
    let programaId: string;

    beforeAll(async () => {
      const created = await service.create(gestor, body({ ...complete, periodo: '2030', fecha_inicio: '2030-01-01', fecha_fin: '2030-12-01' }));
      programaId = created.id;
    });

    it('al enviar queda pendiente, notifica a la dirección y ya no se edita', async () => {
      const sent = await service.send(programaId, gestor, body({}));

      expect(sent.estado).toBe('pendiente_aprobacion');
      expect(sent.enviado_en).not.toBeNull();
      const notices = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, direccion.sub));
      expect(notices.some((notice) => notice.tipo === 'programa_pendiente_aprobacion' && notice.entidadId === programaId)).toBe(true);
      await expect(service.update(programaId, gestor, body({ objetivos: 'Otro' }))).rejects.toBeInstanceOf(ConflictException);
      await expect(service.send(programaId, gestor, body({}))).rejects.toBeInstanceOf(ConflictException);
    });

    it('no se puede devolver sin motivo', async () => {
      await expect(service.giveBack(programaId, direccion, undefined)).rejects.toBeInstanceOf(UnprocessableEntityException);
      await expect(service.giveBack(programaId, direccion, '   ')).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect((await query.find(programaId, scenario.organizacionId, 'direccion')).estado).toBe('pendiente_aprobacion');
    });

    it('al devolver guarda el motivo, avisa al gestor y permite corregir y reenviar', async () => {
      const returned = await service.giveBack(programaId, direccion, 'Faltan objetivos medibles');

      expect(returned.estado).toBe('devuelto');
      expect(returned.motivo_devolucion).toBe('Faltan objetivos medibles');
      const notices = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, gestor.sub));
      expect(notices.some((notice) => notice.tipo === 'programa_devuelto' && notice.mensaje.includes('Faltan objetivos medibles'))).toBe(true);

      const fixed = await service.update(programaId, gestor, body({ objetivos: 'Objetivos medibles por proceso' }));
      expect(fixed.estado).toBe('devuelto');
      const resent = await service.send(programaId, gestor, body({}));
      expect(resent.estado).toBe('pendiente_aprobacion');
      expect(resent.motivo_devolucion).toBeNull();
    });

    it('al aprobar deja constancia de quién y cuándo, versiona y avisa al gestor', async () => {
      const approved = await service.approve(programaId, direccion);

      expect(approved.estado).toBe('aprobado');
      expect(approved.aprobado_por).toBe('Usuario admin');
      expect(approved.aprobado_en).not.toBeNull();
      const [row] = await database.orm.select().from(programaAuditoria).where(eq(programaAuditoria.id, programaId));
      expect(row.aprobadoPorId).toBe(direccion.sub);
      expect(row.fechaAprobacion).toBe(new Date().toISOString().slice(0, 10));
      const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, programaId));
      expect(versions.some((version) => version.creadoPorId === direccion.sub)).toBe(true);
      const notices = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, gestor.sub));
      expect(notices.some((notice) => notice.tipo === 'programa_aprobado')).toBe(true);
    });

    it('no se puede decidir dos veces sobre el mismo programa', async () => {
      await expect(service.approve(programaId, direccion)).rejects.toBeInstanceOf(ConflictException);
      await expect(service.giveBack(programaId, direccion, 'Tarde')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('aislamiento por organización y visibilidad', () => {
    it('otra organización recibe 404 en lectura, edición y aprobación', async () => {
      const [draft] = await query.list(scenario.organizacionId, 'gestor');

      await expect(query.detail(draft.id, otroGestor.organizacionId, 'gestor')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.update(draft.id, otroGestor, body({ objetivos: 'x' }))).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.approve(draft.id, otroGestor)).rejects.toBeInstanceOf(NotFoundException);
      expect((await query.list(otroGestor.organizacionId, 'gestor')).every((row) => row.organizacionId === otroGestor.organizacionId)).toBe(true);
    });

    it('la dirección no ve borradores', async () => {
      const rows = await query.list(scenario.organizacionId, 'direccion');

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.estado !== 'borrador')).toBe(true);
      const [draft] = await query.list(scenario.organizacionId, 'gestor').then((all) => all.filter((row) => row.estado === 'borrador'));
      await expect(query.find(draft.id, scenario.organizacionId, 'direccion')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('datos de pantalla', () => {
    let provider: ProgramaScreenDataProvider;

    beforeAll(() => {
      provider = new ProgramaScreenDataProvider(query);
    });

    it('programa.editar sin entidad propone áreas, frecuencia y opciones del selector', async () => {
      const result = await provider.load({ screenId: 'programa.editar', user: gestor, role: 'gestor' });

      expect(result.entity).toBeUndefined();
      const data = result.data as { programa: Record<string, unknown>; opciones: { procesos: { value: string; label: string }[] } };
      expect(data.programa.procesos_prioritarios).toEqual([scenario.procesoId, ventasId]);
      expect(data.programa.frecuencia).toBe('Anual');
      expect(data.opciones.procesos.map((option) => option.label)).toEqual(['Compras', 'Ventas']);
      expect(result.offline).toEqual({ enabled: false });
    });

    it('programa.editar con entidad entrega el programa y su estado', async () => {
      const [draft] = await query.list(scenario.organizacionId, 'gestor').then((all) => all.filter((row) => row.periodo === '2027'));
      const result = await provider.load({ screenId: 'programa.editar', user: gestor, role: 'gestor', entityId: draft.id });

      expect(result.entity).toEqual({ type: 'programa_auditoria', id: draft.id, version: draft.version, estado: 'borrador' });
      expect((result.data as { programa: { periodo: string } }).programa.periodo).toBe('2027');
    });

    it('programa.lista entrega la lista y el calendario con inicio y fin', async () => {
      const result = await provider.load({ screenId: 'programa.lista', user: gestor, role: 'gestor' });
      const data = result.data as { programas: { title: string; status: string }[]; programa: { id: string; calendario: { date: string }[] } };

      expect(data.programas.some((item) => item.title === 'Programa 2030' && item.status === 'Aprobado')).toBe(true);
      expect(data.programa.id).not.toBe('');
      expect(data.programa.calendario.length).toBeGreaterThanOrEqual(2);
      expect(result.offline?.enabled).toBe(true);
    });

    it('programa.aprobar toma el programa pendiente más reciente y muestra su resumen', async () => {
      const created = await service.create(gestor, body({ ...complete, periodo: '2031', fecha_inicio: '2031-01-01', fecha_fin: '2031-12-01' }));
      await service.send(created.id, gestor, body({}));

      const result = await provider.load({ screenId: 'programa.aprobar', user: direccion, role: 'direccion' });

      expect(result.entity).toMatchObject({ id: created.id, estado: 'pendiente_aprobacion' });
      const data = result.data as { programa: Record<string, string>; decision: { motivo_devolucion: string } };
      expect(data.programa.periodo).toBe('2031');
      expect(data.programa.procesos_prioritarios).toBe('Compras, Ventas');
      expect(data.programa.aprobado_en).toBe('');
      expect(data.decision.motivo_devolucion).toBe('');
      await service.approve(created.id, direccion);
    });

    it('programa.aprobar sin programas pendientes devuelve datos vacíos sin entidad', async () => {
      const result = await provider.load({ screenId: 'programa.aprobar', user: token(await TestSeed.usuario(database, await TestSeed.organizacion(database, 'Vacía'), 'admin')), role: 'direccion' });

      expect(result.entity).toBeUndefined();
      expect(result.data).toEqual({ programa: {}, decision: { motivo_devolucion: '' } });
    });
  });

  describe('documento .docx', () => {
    it('genera el programa anual con calendario, prioridades y constancia de aprobación', async () => {
      const [approved] = await query.list(scenario.organizacionId, 'gestor').then((all) => all.filter((row) => row.periodo === '2030'));
      const documents = new ProgramaDocumentService(database.db, query);

      const file = await documents.annualProgram(approved.id, scenario.organizacionId, 'gestor');
      const text = await DocxInspector.text(file.buffer);

      expect(file.fileName).toBe('programa-anual-auditoria-2030.docx');
      expect(text).toContain('Programa anual de auditoría');
      expect(text).toContain('Compras');
      expect(text).toContain('Usuario admin');
      expect(text).toContain('Aprobado');
      expect(text).toContain('Alta dirección');
    });

    it('otra organización no puede descargar el documento', async () => {
      const [approved] = await query.list(scenario.organizacionId, 'gestor').then((all) => all.filter((row) => row.periodo === '2030'));
      const documents = new ProgramaDocumentService(database.db, query);

      await expect(documents.annualProgram(approved.id, otroGestor.organizacionId, 'gestor')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

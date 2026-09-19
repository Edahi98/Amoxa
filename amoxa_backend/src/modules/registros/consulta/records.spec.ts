import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService, type Confidencialidad } from '@registros-versionado/record-version.service.js';
import { ConfidentialityPolicy } from '@registros-consulta/confidentiality-policy.js';
import { RecordHistoryDataProvider } from '@registros-consulta-record/record-history-data.provider.js';
import { RecordHistoryService } from '@registros-consulta-record/record-history.service.js';
import { RecordSearchDataProvider } from '@registros-consulta-record/record-search-data.provider.js';
import { RecordSearchService } from '@registros-consulta-record/record-search.service.js';
import { RecordsController } from '@registros-consulta/records.controller.js';
import { RecordHistoryDocx } from '@docx-registros/record-history.docx.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { SeguimientoFixture } from '@testing/seguimiento/seguimiento-fixture.js';
import { RecordSearchSchema } from '@validators-registros/record-search.schema.js';

describe('Consulta de registros', () => {
  let database: TestDatabase;
  let search: RecordSearchService;
  let history: RecordHistoryService;
  let versions: RecordVersionService;
  let gestor: TokenPayload;
  let direccion: TokenPayload;
  let liderA: TokenPayload;
  let duenoA: TokenPayload;
  let auditor: TokenPayload;
  let otroGestor: TokenPayload;
  let ids: Record<string, string>;

  const idsOf = async (user: TokenPayload, role: Parameters<RecordSearchService['search']>[1], input = {}) =>
    (await search.search(user, role, input)).registros.map((item) => item.entidadId).sort();

  const record = (
    entidadTipo: string,
    entidadId: string,
    confidencialidad: Confidencialidad = 'interno',
    contenido: unknown = { v: 1 },
    autorId: string = gestor.sub,
  ) => versions.record({ entidadTipo, entidadId, creadoPorId: autorId, contenido, confidencialidad });

  beforeAll(async () => {
    database = await TestDatabase.create();
    const fixture = new SeguimientoFixture(database);
    const organizacionId = await TestSeed.organizacion(database, 'Amoxa Demo');
    const otraId = await TestSeed.organizacion(database, 'Otra');
    const token = (id: string, rol: TokenPayload['rol'], org = organizacionId): TokenPayload => new FakeRequest(rol, id, org).user!;
    const gestorId = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
    const direccionId = (await TestSeed.usuario(database, organizacionId, 'admin')).id;
    const liderAId = (await TestSeed.usuario(database, organizacionId, 'lider_auditor')).id;
    const liderBId = (await TestSeed.usuario(database, organizacionId, 'lider_auditor')).id;
    const duenoAId = (await TestSeed.usuario(database, organizacionId, 'auditado')).id;
    const duenoBId = (await TestSeed.usuario(database, organizacionId, 'auditado')).id;
    const auditorId = (await TestSeed.usuario(database, organizacionId, 'auditor')).id;
    const otroGestorId = (await TestSeed.usuario(database, otraId, 'gestor_programa')).id;
    gestor = token(gestorId, 'gestor_programa');
    direccion = token(direccionId, 'admin');
    liderA = token(liderAId, 'lider_auditor');
    duenoA = token(duenoAId, 'auditado');
    auditor = token(auditorId, 'auditor');
    otroGestor = token(otroGestorId, 'gestor_programa', otraId);

    const procesoA = await fixture.proceso(organizacionId, duenoAId, 'Compras');
    const procesoB = await fixture.proceso(organizacionId, duenoBId, 'Producción');
    await fixture.asignarProceso(duenoAId, procesoA);
    const programa = await fixture.programa(organizacionId, '2026');
    const auditoriaA = await fixture.auditoria(programa, liderAId, 'en_curso', [procesoA, procesoB]);
    const auditoriaB = await fixture.auditoria(programa, liderBId, 'en_curso', [procesoB]);
    const auditoriaC = await fixture.auditoria(programa, liderAId, 'planificada', [procesoA]);
    const hallazgoA = await fixture.hallazgo(auditoriaA, procesoA, auditorId, 'NC');
    const hallazgoB = await fixture.hallazgo(auditoriaA, procesoB, auditorId, 'NC');
    const accionA = await fixture.accion(hallazgoA, duenoAId, 'pendiente', '2999-01-01');
    const accionB = await fixture.accion(hallazgoB, duenoBId, 'pendiente', '2999-01-01');
    ids = { programa, auditoriaA, auditoriaB, auditoriaC, hallazgoA, hallazgoB, accionA, accionB };

    versions = new RecordVersionService(database.db);
    search = new RecordSearchService(database.db);
    history = new RecordHistoryService(database.db);

    await record('programa', programa);
    await record('auditoria', auditoriaA);
    await record('auditoria', auditoriaA, 'interno', { v: 2 });
    await record('auditoria', auditoriaB);
    await record('auditoria', auditoriaC, 'confidencial');
    await record('hallazgo', hallazgoA);
    await record('hallazgo', hallazgoB);
    await record('accion', accionA);
    await record('accion', accionB, 'restringido', { v: 1 }, liderBId);
    await versions.record({ entidadTipo: 'auditoria', entidadId: ids.auditoriaA, creadoPorId: otroGestor.sub, contenido: 'ajeno' });
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('la alta dirección y el gestor consultan todo lo de su organización, con la confidencialidad de cada rol', async () => {
    const todos = [ids.programa, ids.auditoriaA, ids.auditoriaB, ids.hallazgoA, ids.hallazgoB, ids.accionA].sort();

    expect(await idsOf(gestor, 'gestor')).toEqual([...todos, ids.auditoriaC].sort());
    expect(await idsOf(direccion, 'direccion')).toEqual([...todos, ids.auditoriaC, ids.accionB].sort());
  });

  it('el líder solo ve registros de sus auditorías y sin lo confidencial', async () => {
    expect(await idsOf(liderA, 'lider')).toEqual([ids.auditoriaA, ids.hallazgoA, ids.hallazgoB, ids.accionA].sort());
  });

  it('el dueño de proceso solo ve registros de su proceso', async () => {
    expect(await idsOf(duenoA, 'dueno_proceso')).toEqual([ids.auditoriaA, ids.hallazgoA, ids.accionA].sort());
  });

  it('no mezcla organizaciones ni permite a otros roles consultar', async () => {
    expect(await idsOf(otroGestor, 'gestor')).toEqual([ids.auditoriaA]);
    await expect(search.search(auditor, 'auditor', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el autor siempre ve sus propios registros aunque sean confidenciales', async () => {
    const propio = await versions.record({
      entidadTipo: 'informe',
      entidadId: '99999999-9999-4999-8999-999999999999',
      creadoPorId: liderA.sub,
      contenido: 'x',
      confidencialidad: 'restringido',
    });

    expect(propio.version).toBe(1);
    expect(ConfidentialityPolicy.canRead('lider', 'restringido', liderA.sub, liderA.sub)).toBe(true);
    expect(ConfidentialityPolicy.canRead('lider', 'restringido', gestor.sub, liderA.sub)).toBe(false);
    expect(ConfidentialityPolicy.canRead('gestor', 'confidencial', gestor.sub, liderA.sub)).toBe(true);
    expect(ConfidentialityPolicy.levelsFor('gestor')).not.toContain('restringido');
    expect(ConfidentialityPolicy.levelsFor('direccion')).toContain('restringido');
  });

  it('busca por tipo y por texto y muestra solo la última versión de cada registro', async () => {
    const auditorias = await search.search(direccion, 'direccion', { tipo: 'auditoria' });
    const porTexto = await search.search(direccion, 'direccion', { texto: 'hallazg' });
    const sinResultados = await search.search(direccion, 'direccion', { texto: 'inexistente' });
    const comodin = await search.search(direccion, 'direccion', { texto: '%' });

    expect(auditorias.registros.filter((item) => item.entidadId === ids.auditoriaA)).toHaveLength(1);
    expect(auditorias.registros.find((item) => item.entidadId === ids.auditoriaA)?.version).toBe(2);
    expect(auditorias.registros.every((item) => item.entidadTipo === 'auditoria')).toBe(true);
    expect(porTexto.registros.map((item) => item.entidadTipo)).toEqual(['hallazgo', 'hallazgo']);
    expect(sinResultados.total).toBe(0);
    expect(comodin.total).toBe(0);
  });

  it('pagina los resultados', async () => {
    const first = await search.search(direccion, 'direccion', { page: 1, pageSize: 3 });
    const second = await search.search(direccion, 'direccion', { page: 2, pageSize: 3 });

    expect(first.total).toBe((await idsOf(direccion, 'direccion', { pageSize: 100 })).length);
    expect(first.registros).toHaveLength(3);
    expect(second.registros).toHaveLength(3);
    expect(first.registros.map((item) => item.entidadId)).not.toEqual(second.registros.map((item) => item.entidadId));
  });

  it('entrega el historial de versiones con autor, fecha y huella, y nunca de otra organización', async () => {
    const view = await history.history(gestor, 'gestor', ids.auditoriaA);

    expect(view.historial.versiones.map((item) => item.version)).toEqual([2, 1]);
    expect(view.historial.versiones[0].hash).toHaveLength(64);
    expect(view.historial.versiones[0].autor).toBe('Usuario gestor_programa');
    expect(view.registro.entidadTipo).toBe('auditoria');
    const ajeno = await history.entries(otroGestor, 'gestor', ids.auditoriaA);
    expect(ajeno).toHaveLength(1);
  });

  it('responde 404 cuando el registro no existe o el rol no puede verlo', async () => {
    await expect(history.history(liderA, 'lider', ids.auditoriaB)).rejects.toBeInstanceOf(NotFoundException);
    await expect(history.history(gestor, 'gestor', ids.accionB)).rejects.toBeInstanceOf(NotFoundException);
    await expect(history.history(duenoA, 'dueno_proceso', ids.hallazgoB)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exporta el historial a docx con versión, autor, fecha, huella y confidencialidad', async () => {
    const data = await history.documentData(gestor, 'gestor', ids.auditoriaA);
    const file = await RecordHistoryDocx.build(data);
    const text = await DocxInspector.text(file.buffer);

    expect(text).toContain('Historial de versiones del registro');
    expect(text).toContain('Huella (SHA-256)');
    expect(text).toContain('Usuario gestor_programa');
    expect(text).toContain('interno');
    expect(data.versiones).toHaveLength(2);
  });

  it('entrega los datos de pantalla del buscador y del historial', async () => {
    const buscador = await new RecordSearchDataProvider(search).load({ screenId: 'registro.buscar', user: liderA, role: 'lider' });
    const detalle = await new RecordHistoryDataProvider(history).load({
      screenId: 'registro.historial',
      user: gestor,
      role: 'gestor',
      entityId: ids.auditoriaA,
    });
    const vacio = await new RecordHistoryDataProvider(history).load({ screenId: 'registro.historial', user: gestor, role: 'gestor' });

    expect(buscador.data?.busqueda).toEqual({ texto: '', tipo: '' });
    expect((buscador.data?.registros as unknown[]).length).toBe(4);
    expect(detalle.entity).toMatchObject({ type: 'registro', id: ids.auditoriaA, version: 2 });
    expect((detalle.data?.historial as { versiones: unknown[] }).versiones).toHaveLength(2);
    expect((vacio.data?.historial as { versiones: unknown[] }).versiones).toEqual([]);
  });

  it('el controlador resuelve el rol de la sesión y protege todas las rutas', async () => {
    const controller = new RecordsController(search, history);
    const page = await controller.list(new FakeRequest('lider_auditor', liderA.sub, liderA.organizacionId).asRequest(), {});

    expect(page.total).toBe(4);
    expect(RouteGuardInspector.unprotected(RecordsController)).toEqual([]);
    expect(RouteGuardInspector.guardsOf(RecordsController, 'exportHistory')).toContain('PermissionsGuard');
    expect(RouteGuardInspector.guardsOf(RecordsController, 'list')).toContain('PermissionsGuard');
  });

  it('no expone rutas de escritura ni de borrado', () => {
    const prototype = RecordsController.prototype as unknown as Record<string, unknown>;
    const methods = Object.getOwnPropertyNames(prototype)
      .filter((name) => typeof prototype[name] === 'function' && Reflect.getMetadata('method', prototype[name] as object) !== undefined)
      .map((name) => Reflect.getMetadata('method', prototype[name] as object) as number);

    expect(methods.every((method) => method === 0)).toBe(true);
  });

  it('valida la búsqueda: texto seguro, tipo simple y paginación acotada', () => {
    expect(RecordSearchSchema.safeParse({ texto: '', tipo: '' }).data).toEqual({});
    expect(RecordSearchSchema.safeParse({ texto: 'x union select' }).success).toBe(false);
    expect(RecordSearchSchema.safeParse({ tipo: 'Informe; drop' }).success).toBe(false);
    expect(RecordSearchSchema.safeParse({ page: '2', pageSize: '10' }).data).toMatchObject({ page: 2, pageSize: 10 });
    expect(RecordSearchSchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });
});

import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { FakeRequest } from '@testing-fakes/fake-request.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { SeguimientoFixture } from '@testing/seguimiento/seguimiento-fixture.js';
import { IndicatorQuery } from '@seguimiento-indicadores-indicator/indicator-query.js';
import { IndicatorsController } from '@seguimiento-indicadores-indicators/indicators.controller.js';
import { IndicatorsReportService } from '@seguimiento-indicadores-indicators/indicators-report.service.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';
import { IndicatorQuerySchema } from '@validators-seguimiento/indicator-query.schema.js';
import { IndicatorsReportDocx } from '@docx-seguimiento/indicators-report.docx.js';

describe('Indicadores del programa', () => {
  let database: TestDatabase;
  let service: IndicatorsService;
  let controller: IndicatorsController;
  let organizacionId: string;
  let gestorId: string;
  let direccionId: string;
  let compras: string;
  let produccion: string;
  let otraOrganizacionId: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const fixture = new SeguimientoFixture(database);
    organizacionId = await TestSeed.organizacion(database, 'Amoxa Demo');
    otraOrganizacionId = await TestSeed.organizacion(database, 'Otra');
    gestorId = (await TestSeed.usuario(database, organizacionId, 'gestor_programa')).id;
    direccionId = (await TestSeed.usuario(database, organizacionId, 'admin')).id;
    const auditorId = (await TestSeed.usuario(database, organizacionId, 'auditor')).id;
    const duenoId = (await TestSeed.usuario(database, organizacionId, 'auditado')).id;
    compras = await fixture.proceso(organizacionId, duenoId, 'Compras');
    produccion = await fixture.proceso(organizacionId, duenoId, 'Producción');

    const programa = await fixture.programa(organizacionId, '2026');
    const cerrada = await fixture.auditoria(programa, gestorId, 'cerrada', [compras]);
    await fixture.auditoria(programa, gestorId, 'planificada', [produccion]);
    await fixture.auditoria(programa, gestorId, 'cancelada', [produccion]);
    const ncCompras = await fixture.hallazgo(cerrada, compras, auditorId, 'NC');
    await fixture.hallazgo(cerrada, compras, auditorId, 'NC', 'cerrado');
    await fixture.hallazgo(cerrada, compras, auditorId, 'OM');
    await fixture.accion(ncCompras, duenoId, 'pendiente', '2020-01-01', 'Acción vencida por fecha');
    await fixture.accion(ncCompras, duenoId, 'pendiente', '2999-01-01');
    await fixture.accion(ncCompras, duenoId, 'completada', '2020-01-01');
    await fixture.accion(ncCompras, duenoId, 'vencida', null, 'Acción marcada vencida');

    const otroPrograma = await fixture.programa(otraOrganizacionId, '2026');
    const otroLider = (await TestSeed.usuario(database, otraOrganizacionId, 'lider_auditor')).id;
    await fixture.auditoria(otroPrograma, otroLider, 'cerrada');

    const query = new IndicatorQuery(database.db);
    service = new IndicatorsService(query);
    controller = new IndicatorsController(service, new IndicatorsReportService(database.db, service));
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('calcula calendario, incumplimientos por área y acciones atrasadas sin contar otras organizaciones', async () => {
    const result = await service.compute({ organizacionId, hoy: '2026-06-15' });

    expect(result.auditorias_realizadas).toBe(1);
    expect(result.auditorias_planificadas).toBe(2);
    expect(result.cumplimiento_calendario).toBe(50);
    expect(result.incumplimientos_totales).toBe(2);
    expect(result.hallazgos_abiertos).toBe(1);
    expect(result.incumplimientos_por_area.labels).toEqual(['Compras']);
    expect(result.acciones_atrasadas).toBe(2);
    expect(result.atrasadas_por_area.datasets[0].data).toEqual([2]);
    expect(result.acciones_atrasadas_detalle.map((row) => row.descripcion).sort()).toEqual([
      'Acción marcada vencida',
      'Acción vencida por fecha',
    ]);
  });

  it('filtra por periodo y por área', async () => {
    const otroPeriodo = await service.compute({ organizacionId, periodo: '2030' });
    const porProduccion = await service.compute({ organizacionId, area: produccion, hoy: '2026-06-15' });
    const porCompras = await service.compute({ organizacionId, area: compras, hoy: '2026-06-15' });

    expect(otroPeriodo.auditorias_planificadas).toBe(0);
    expect(porProduccion.auditorias_realizadas).toBe(0);
    expect(porProduccion.auditorias_planificadas).toBe(1);
    expect(porProduccion.incumplimientos_totales).toBe(0);
    expect(porCompras.incumplimientos_totales).toBe(2);
  });

  it('devuelve la vista del dashboard para la dirección con los filtros aplicados', async () => {
    const request = new FakeRequest('admin', direccionId, organizacionId).asRequest();

    const view = await controller.list(request, { periodo: '2026', area: compras });

    expect(view.filtros).toEqual({ periodo: '2026', area: compras });
    expect(view.indicadores.auditorias_realizadas).toBe(1);
  });

  it('genera el reporte docx con KPI, incumplimientos y acciones atrasadas', async () => {
    const data = await new IndicatorsReportService(database.db, service).data(
      new FakeRequest('gestor_programa', gestorId, organizacionId).user!,
      '2026',
      compras,
    );
    const file = await IndicatorsReportDocx.build(data);
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toBe('reporte-indicadores-2026.docx');
    expect(text).toContain('Reporte de indicadores del programa');
    expect(await DocxInspector.headerText(file.buffer)).toContain('Amoxa Demo');
    expect(text).toContain('Cumplimiento del calendario');
    expect(text).toContain('Compras');
    expect(text).toContain('Acción vencida por fecha');
  });

  it('protege las rutas con sesión, rol y permisos de dashboard', () => {
    expect(RouteGuardInspector.unprotected(IndicatorsController)).toEqual([]);
    expect(RouteGuardInspector.guardsOf(IndicatorsController, 'list')).toContain('PermissionsGuard');
    expect(RouteGuardInspector.guardsOf(IndicatorsController, 'document')).toContain('PermissionsGuard');
  });

  it('valida el filtro: área UUID, periodo seguro y vacíos se ignoran', () => {
    expect(IndicatorQuerySchema.safeParse({ periodo: '', area: '' }).data).toEqual({});
    expect(IndicatorQuerySchema.safeParse({ area: 'no-uuid' }).success).toBe(false);
    expect(IndicatorQuerySchema.safeParse({ periodo: "2026' OR 1=1" }).success).toBe(false);
    expect(IndicatorQuerySchema.safeParse({ periodo: '2026' }).success).toBe(true);
  });
});

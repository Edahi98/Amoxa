import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { PlantillaBodySchema } from '@validators-plantillas/plantilla-body.schema.js';
import { PreguntaBodySchema } from '@validators-plantillas/pregunta-body.schema.js';
import { PlantillaIdSchema } from '@validators-plantillas/plantilla-id.schema.js';
import { CriterioMapper } from '@plantillas-rules/criterio-mapper.js';
import { TemplateCoverage } from '@plantillas-rules/template-coverage.js';
import { PlantillaStatus } from '@plantillas-rules/plantilla-status.js';
import { PlantillasController } from '@plantillas-controllers/plantillas.controller.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { RoutePermissionInspector } from '@testing-http-route/route-permission-inspector.js';

describe('PlantillasController', () => {
  it('todas las rutas exigen sesión y rol existente', () => {
    expect(RouteGuardInspector.unprotected(PlantillasController)).toEqual([]);
  });

  it.each([
    ['list', ['plantilla.consultar']],
    ['eligible', ['plantilla.consultar']],
    ['detail', ['plantilla.consultar']],
    ['format', ['plantilla.consultar']],
    ['create', ['plantilla.crear']],
    ['update', ['plantilla.editar']],
    ['addQuestion', ['plantilla.editar']],
    ['propose', ['plantilla.proponer']],
    ['acceptProposal', ['plantilla.editar']],
    ['rejectProposal', ['plantilla.editar']],
    ['publish', ['plantilla.publicar']],
    ['newVersion', ['plantilla.editar']],
  ])('la ruta %s exige los permisos %j', (route, permissions) => {
    expect(RouteGuardInspector.guardsOf(PlantillasController, route)).toEqual(['JwtAuthGuard', 'RoleExistsGuard', 'PermissionsGuard']);
    expect(RoutePermissionInspector.of(PlantillasController, route).all).toEqual(permissions);
  });
});

describe('validadores de plantillas', () => {
  const pregunta = new ZodValidationPipe(PreguntaBodySchema);

  it('acepta el contexto de la pantalla y toma solo la pregunta', () => {
    const result = pregunta.transform({
      plantilla: { nombre: 'Checklist', preguntas: [] },
      pregunta: { texto: '¿Se controla el proceso?', clausula: '8.5', criterio: 'norma' },
    }) as { texto: string; clausula: string; criterio: string };

    expect(result).toMatchObject({ texto: '¿Se controla el proceso?', clausula: '8.5', criterio: 'norma' });
  });

  it.each([
    [{ texto: '', clausula: '8.5', criterio: 'norma' }],
    [{ texto: 'Válida', clausula: '', criterio: 'norma' }],
    [{ texto: 'Válida', clausula: '8.5', criterio: 'otro' }],
    [{ texto: "x' OR '1'='1", clausula: '8.5', criterio: 'norma' }],
    [{ texto: '<script>alert(1)</script>', clausula: '8.5', criterio: 'norma' }],
    [{ texto: 'Válida', clausula: '8.5; DROP', criterio: 'norma' }],
  ])('rechaza %j con un mensaje genérico', (data) => {
    expect(() => pregunta.transform({ pregunta: data })).toThrow('Datos no validos');
  });

  it('valida el nombre de la plantilla y los identificadores', () => {
    const nombre = new ZodValidationPipe(PlantillaBodySchema);

    expect((nombre.transform({ plantilla: { nombre: 'Checklist' } }) as { nombre: string }).nombre).toBe('Checklist');
    expect(() => nombre.transform({ plantilla: { nombre: 'select * from usuario' } })).toThrow('Datos no validos');
    expect(() => nombre.transform({})).toThrow('Datos no validos');
    expect(() => new ZodValidationPipe(PlantillaIdSchema).transform('vigentes')).toThrow('Datos no validos');
  });
});

describe('TemplateCoverage', () => {
  it('exige preguntas de ISO 9001 con cláusula válida y preguntas propias', () => {
    expect(TemplateCoverage.evaluate([])).toMatchObject({ iso9001: false, propios: false, completa: false });
    expect(TemplateCoverage.evaluate([{ tipoCriterio: 'ISO_9001', clausulaRef: 'propio' }, { tipoCriterio: 'propio', clausulaRef: 'propio' }])).toMatchObject({
      iso9001: false,
      propios: true,
    });
    const complete = TemplateCoverage.evaluate([
      { tipoCriterio: 'ISO_9001', clausulaRef: '9.2' },
      { tipoCriterio: 'propio', clausulaRef: 'propio' },
    ]);
    expect(complete).toMatchObject({ iso9001: true, propios: true, completa: true, faltantes: '' });
    expect(complete.capitulos_sin_preguntas).toEqual(['4', '5', '6', '7', '8', '10']);
  });

  it('describe cada faltante por separado', () => {
    const report = TemplateCoverage.evaluate([{ tipoCriterio: 'legal', clausulaRef: null }]);

    expect(report.detalle).toHaveLength(2);
    expect(report.faltantes).toContain('ISO 9001');
    expect(report.faltantes).toContain('requisitos propios');
  });
});

describe('CriterioMapper y PlantillaStatus', () => {
  it('traduce el tipo de criterio de la pantalla al de la base y viceversa', () => {
    expect(CriterioMapper.toDb('norma')).toBe('ISO_9001');
    expect(CriterioMapper.toDb('procedimiento')).toBe('propio');
    expect(CriterioMapper.toView('ISO_9001')).toBe('norma');
    expect(CriterioMapper.toView('propio')).toBe('procedimiento');
    expect(CriterioMapper.label('propio')).toContain('propio');
  });

  it('solo las plantillas publicadas y vigentes son elegibles', () => {
    expect(PlantillaStatus.isEligible('publicada', true)).toBe(true);
    expect(PlantillaStatus.isEligible('publicada', false)).toBe(false);
    expect(PlantillaStatus.isEligible('borrador', true)).toBe(false);
    expect(PlantillaStatus.canEdit('publicada')).toBe(false);
    expect(PlantillaStatus.label('publicada', true)).toBe('Publicada (vigente)');
  });
});

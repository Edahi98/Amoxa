import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { AuditorFichaSchema } from '@validators-auditores/auditor-ficha.schema.js';
import { AuditorIdSchema } from '@validators-auditores/auditor-id.schema.js';
import { EvaluacionBodySchema } from '@validators-auditores-evaluacion/evaluacion-body.schema.js';
import { AuditorAccess } from '@auditores-rules-auditor/auditor-access.js';
import { AuditorAptitude } from '@auditores-rules-auditor/auditor-aptitude.js';
import { CompetenceCalculator } from '@auditores-rules/competence-calculator.js';
import { SpecialtyParser } from '@auditores-rules/specialty-parser.js';
import { AuditoresController } from '@auditores-controllers/auditores.controller.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { RoutePermissionInspector } from '@testing-http-route/route-permission-inspector.js';

describe('AuditoresController', () => {
  it('todas las rutas exigen sesión y rol existente', () => {
    expect(RouteGuardInspector.unprotected(AuditoresController)).toEqual([]);
  });

  it.each([
    ['list', { all: ['auditor.consultar'], any: [] }],
    ['detail', { all: [], any: ['auditor.consultar', 'auditor.ver_ficha_propia'] }],
    ['fichaDocument', { all: [], any: ['auditor.consultar', 'auditor.ver_ficha_propia'] }],
    ['evaluationDocument', { all: [], any: ['auditor.consultar', 'auditor.ver_ficha_propia'] }],
    ['updateFicha', { all: ['auditor.editar_ficha'], any: [] }],
    ['registerEvaluation', { all: ['auditor.evaluar'], any: [] }],
  ])('la ruta %s exige los permisos esperados', (route, expected) => {
    expect(RouteGuardInspector.guardsOf(AuditoresController, route)).toEqual(['JwtAuthGuard', 'RoleExistsGuard', 'PermissionsGuard']);
    expect(RoutePermissionInspector.of(AuditoresController, route)).toEqual(expected);
  });
});

describe('validadores de auditores', () => {
  const evaluation = new ZodValidationPipe(EvaluacionBodySchema);

  it('acepta el contexto de la pantalla de evaluación', () => {
    const result = evaluation.transform({
      auditor: { nombre: 'Ana' },
      evaluacion: { metodos: ['examen', 'entrevista'], resultado: 'satisfactorio', observaciones: '', ultima_id: '' },
    }) as { metodos: string[]; observaciones?: string };

    expect(result.metodos).toEqual(['examen', 'entrevista']);
    expect(result.observaciones).toBeUndefined();
  });

  it.each([
    [{ metodos: ['revision_desempeno', 'examen'], resultado: 'satisfactorio' }],
    [{ metodos: ['examen'], resultado: 'aprobado' }],
    [{ metodos: ['examen', 'entrevista'], resultado: 'satisfactorio', observaciones: '1; DROP TABLE auditor' }],
    [{ metodos: ['examen', 'entrevista'], resultado: 'satisfactorio', observaciones: '<script>x</script>' }],
    [{ metodos: ['examen', 'entrevista'], resultado: 'satisfactorio', fecha: 'ayer' }],
  ])('rechaza %j con un mensaje genérico', (data) => {
    expect(() => evaluation.transform({ evaluacion: data })).toThrow('Datos no validos');
  });

  it('la ficha convierte las especialidades a lista y filtra inyecciones', () => {
    const pipe = new ZodValidationPipe(AuditorFichaSchema);

    expect((pipe.transform({ auditor: { especialidades: 'Compras, Ventas' } }) as { especialidades: string[] }).especialidades).toEqual(['Compras', 'Ventas']);
    expect(() => pipe.transform({ auditor: { formacion: "x' OR '1'='1" } })).toThrow('Datos no validos');
    expect(() => new ZodValidationPipe(AuditorIdSchema).transform('abc')).toThrow('Datos no validos');
  });
});

describe('reglas de competencia', () => {
  it('calcula aptitud y vigencia', () => {
    expect(CompetenceCalculator.evaluate({ metodos: ['a', 'b'], resultado: 'satisfactorio', fecha: '2026-01-31', estadoActual: null })).toEqual({
      estado: 'apto',
      vigenciaHasta: '2027-01-31',
    });
    expect(CompetenceCalculator.evaluate({ metodos: ['a'], resultado: 'satisfactorio', fecha: '2026-01-31', estadoActual: 'apto' })).toEqual({
      estado: 'no_apto',
      vigenciaHasta: null,
    });
    expect(
      CompetenceCalculator.evaluate({ metodos: ['a', 'b'], resultado: 'no_satisfactorio', fecha: '2026-01-31', estadoActual: 'formacion' }).estado,
    ).toBe('formacion');
  });

  it('ajusta el fin de mes al sumar meses', () => {
    expect(CompetenceCalculator.addMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(CompetenceCalculator.addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(CompetenceCalculator.addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('describe la aptitud según la vigencia', () => {
    expect(AuditorAptitude.describe('apto', '2027-01-01', '2026-06-01')).toBe('Apto hasta 2027-01-01');
    expect(AuditorAptitude.describe('apto', '2026-01-01', '2026-06-01')).toBe('Vigencia vencida el 2026-01-01');
    expect(AuditorAptitude.describe('apto', null, '2026-06-01')).toBe('Apto (sin vigencia registrada)');
    expect(AuditorAptitude.describe('formacion', null, '2026-06-01')).toBe('En formación');
    expect(AuditorAptitude.isCurrentlyApto('apto', '2026-06-01', '2026-06-01')).toBe(true);
    expect(AuditorAptitude.isCurrentlyApto('apto', '2026-05-31', '2026-06-01')).toBe(false);
    expect(AuditorAptitude.isCurrentlyApto('no_apto', '2030-01-01', '2026-06-01')).toBe(false);
  });

  it('parsea especialidades y controla el acceso a la ficha propia', () => {
    expect(SpecialtyParser.parse(' A, B\nA ,, ')).toEqual(['A', 'B']);
    expect(SpecialtyParser.join(null)).toBe('');
    expect(() => AuditorAccess.assertCanRead('auditor', 'u1', 'u2')).toThrow('propia ficha');
    expect(() => AuditorAccess.assertCanRead('auditor', 'u1', 'u1')).not.toThrow();
    expect(() => AuditorAccess.assertCanRead('gestor', 'u1', 'u2')).not.toThrow();
  });
});

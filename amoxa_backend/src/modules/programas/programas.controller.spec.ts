import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { ProgramaBodySchema } from '@validators-programas/programa-body.schema.js';
import { ProgramaDecisionSchema } from '@validators-programas/programa-decision.schema.js';
import { ProgramaIdSchema } from '@validators-programas/programa-id.schema.js';
import { ProgramasController } from '@programas-controllers/programas.controller.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { RoutePermissionInspector } from '@testing-http-route/route-permission-inspector.js';

describe('ProgramasController', () => {
  it('todas las rutas exigen sesión y rol existente', () => {
    expect(RouteGuardInspector.unprotected(ProgramasController)).toEqual([]);
  });

  it.each([
    ['list', ['programa.consultar']],
    ['detail', ['programa.consultar']],
    ['document', ['programa.consultar']],
    ['create', ['programa.crear']],
    ['update', ['programa.editar']],
    ['send', ['programa.editar']],
    ['approve', ['programa.aprobar']],
    ['giveBack', ['programa.devolver']],
  ])('la ruta %s exige los permisos %j', (route, permissions) => {
    expect(RouteGuardInspector.guardsOf(ProgramasController, route)).toEqual(['JwtAuthGuard', 'RoleExistsGuard', 'PermissionsGuard']);
    expect(RoutePermissionInspector.of(ProgramasController, route).all).toEqual(permissions);
  });
});

describe('validadores de programas', () => {
  const pipe = new ZodValidationPipe(ProgramaBodySchema);

  it('acepta el contexto de la pantalla con campos extra y lo reduce a los campos del programa', () => {
    const result = pipe.transform({
      programas: [{ id: 'x' }],
      programa: {
        periodo: '2026',
        objetivos: '',
        fecha_inicio: '2026-01-01T00:00:00.000Z',
        procesos_prioritarios: ['0b0f5f4e-52f7-4a0f-9f11-3b8b1c2f7a10', '0b0f5f4e-52f7-4a0f-9f11-3b8b1c2f7a10'],
        prioridad_modificada: false,
        campo_extra: 1,
      },
    }) as Record<string, unknown>;

    expect(result.periodo).toBe('2026');
    expect(result.objetivos).toBeUndefined();
    expect(result.fecha_inicio).toBe('2026-01-01');
    expect(result.procesos_prioritarios).toEqual(['0b0f5f4e-52f7-4a0f-9f11-3b8b1c2f7a10']);
  });

  it('acepta el cuerpo plano y un cuerpo vacío', () => {
    expect((pipe.transform({ periodo: '2026' }) as { periodo: string }).periodo).toBe('2026');
    expect(() => pipe.transform(undefined)).not.toThrow();
  });

  it.each([
    ["1' OR 1=1"],
    ['<script>alert(1)</script>'],
    ['DROP TABLE programa_auditoria'],
    ['javascript:alert(1)'],
  ])('rechaza el texto malicioso %s con un mensaje genérico', (value) => {
    expect(() => pipe.transform({ programa: { objetivos: value } })).toThrow(BadRequestException);
    expect(() => pipe.transform({ programa: { objetivos: value } })).toThrow('Datos no validos');
  });

  it('rechaza fechas y procesos con formato inválido', () => {
    expect(() => pipe.transform({ programa: { fecha_inicio: '31/12/2026' } })).toThrow('Datos no validos');
    expect(() => pipe.transform({ programa: { procesos_prioritarios: ['no-uuid'] } })).toThrow('Datos no validos');
  });

  it('el motivo de devolución también pasa por el filtro de inyección', () => {
    const decision = new ZodValidationPipe(ProgramaDecisionSchema);

    expect((decision.transform({ decision: { motivo_devolucion: 'Faltan objetivos' } }) as { motivo_devolucion: string }).motivo_devolucion).toBe('Faltan objetivos');
    expect(() => decision.transform({ decision: { motivo_devolucion: 'x; DROP TABLE usuario' } })).toThrow('Datos no validos');
  });

  it('el identificador de ruta debe ser un UUID', () => {
    const id = new ZodValidationPipe(ProgramaIdSchema);

    expect(() => id.transform('indicadores')).toThrow('Datos no validos');
    expect(id.transform('0b0f5f4e-52f7-4a0f-9f11-3b8b1c2f7a10')).toBe('0b0f5f4e-52f7-4a0f-9f11-3b8b1c2f7a10');
  });
});

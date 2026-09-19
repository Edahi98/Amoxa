import { AlcanceSchema } from '@validators-auditorias-alcance/alcance.schema.js';
import { ContactoConfirmacionSchema } from '@validators-auditorias-contacto/contacto-confirmacion.schema.js';
import { ContactoRespuestaSchema } from '@validators-auditorias-contacto/contacto-respuesta.schema.js';
import { CrearAuditoriaSchema } from '@validators-auditorias/crear-auditoria.schema.js';
import { EquipoSchema } from '@validators-auditorias/equipo.schema.js';
import { PlanPropuestaSchema } from '@validators-auditorias-plan/plan-propuesta.schema.js';
import { PlanSchema } from '@validators-auditorias-plan/plan.schema.js';
import { UuidParamSchema } from '@validators-auditorias/uuid-param.schema.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';

const ID = '0b8f3c1e-4d2a-4b6e-9c1d-5a7e8f9a0b1c';

describe('validadores de auditorías', () => {
  it('el alcance acepta el cuerpo anidado del contexto o plano, y descarta campos extra', () => {
    const nested = AlcanceSchema.parse({ auditoria: { procesos: [ID], criterios: ['9.2'], metodo: 'mixto', plantilla_id: ID, otro: 1 }, opciones: {} });
    const flat = AlcanceSchema.parse({ procesos: [ID], criterios: ['9.2'], metodo: 'mixto', plantilla_id: ID });

    expect(nested).toEqual(flat);
    expect(nested).toEqual({ procesos: [ID], criterios: ['9.2'], metodo: 'mixto', plantilla_id: ID });
  });

  it('el alcance tolera vacíos para que las reglas de negocio den el código', () => {
    expect(AlcanceSchema.parse({ auditoria: { procesos: [], criterios: [], plantilla_id: '', metodo: '' } })).toEqual({
      procesos: [],
      criterios: [],
    });
    expect(AlcanceSchema.parse(undefined)).toEqual({ procesos: [], criterios: [] });
  });

  it('rechaza identificadores inválidos, métodos desconocidos y texto con inyección', () => {
    const pipe = new ZodValidationPipe(AlcanceSchema);

    expect(() => pipe.transform({ auditoria: { procesos: ['x'] } })).toThrow('Datos no validos');
    expect(() => pipe.transform({ auditoria: { metodo: 'volando' } })).toThrow('Datos no validos');
    expect(() => pipe.transform({ auditoria: { criterios: ["9.2'; DROP TABLE auditoria; --"] } })).toThrow('Datos no validos');
    expect(() => pipe.transform({ auditoria: { objetivos: '<script>alert(1)</script>' } })).toThrow('Datos no validos');
  });

  it('el contacto usa false por defecto y rechaza inyección en observaciones y respuesta', () => {
    expect(ContactoConfirmacionSchema.parse({ contacto: { cooperacion: true } })).toEqual({
      informacion_suficiente: false,
      cooperacion: true,
      tiempo: false,
    });
    expect(() => new ZodValidationPipe(ContactoRespuestaSchema).transform({ contacto: { respuesta: 'a UNION select *' } })).toThrow('Datos no validos');
    expect(ContactoRespuestaSchema.parse({ contacto: { respuesta: 'Estamos listos' } })).toEqual({ respuesta: 'Estamos listos' });
  });

  it('el equipo exige uuids', () => {
    expect(EquipoSchema.parse({ equipo: { miembros: [ID] } })).toEqual({ miembros: [ID] });
    expect(() => new ZodValidationPipe(EquipoSchema).transform({ equipo: { miembros: ['no'] } })).toThrow('Datos no validos');
  });

  it('el plan acepta texto o arreglos, distingue omitir de limpiar y valida fechas', () => {
    expect(PlanSchema.parse({ plan: { fecha_inicio: '2026-11-10', agenda: 'Apertura', tareas: null } })).toEqual({
      fecha_inicio: '2026-11-10',
      agenda: 'Apertura',
      tareas: null,
    });
    expect(PlanSchema.parse({ plan: { tareas: [{ auditorId: ID, descripcion: 'Revisar' }], agenda: ['Apertura'] } })).toEqual({
      tareas: [{ auditorId: ID, descripcion: 'Revisar' }],
      agenda: ['Apertura'],
    });
    expect(() => new ZodValidationPipe(PlanSchema).transform({ plan: { fecha_inicio: '10/11/2026' } })).toThrow('Datos no validos');
    expect(() => new ZodValidationPipe(PlanSchema).transform({ plan: { agenda: 'x; drop table y' } })).toThrow('Datos no validos');
  });

  it('la propuesta acepta la ausencia de fecha para que la regla de negocio responda', () => {
    expect(PlanPropuestaSchema.parse({ plan: { fecha_propuesta: '' } })).toEqual({});
    expect(PlanPropuestaSchema.parse({ plan: { fecha_propuesta: '2026-12-01', motivo_propuesta: 'Cierre' } })).toEqual({
      fecha_propuesta: '2026-12-01',
      motivo_propuesta: 'Cierre',
    });
  });

  it('crear auditoría exige plantilla, líder, procesos y método, y no admite campos extra', () => {
    const valid = { plantillaId: ID, liderId: ID, procesoIds: [ID], metodo: 'remoto' };

    expect(CrearAuditoriaSchema.parse(valid)).toEqual({ ...valid, criterios: [] });
    const pipe = new ZodValidationPipe(CrearAuditoriaSchema);
    expect(() => pipe.transform({ ...valid, procesoIds: [] })).toThrow('Datos no validos');
    expect(() => pipe.transform({ ...valid, extra: 1 })).toThrow('Datos no validos');
    expect(() => pipe.transform({ plantillaId: ID })).toThrow('Datos no validos');
  });

  it('el parámetro de ruta debe ser un uuid', () => {
    expect(UuidParamSchema.parse(ID)).toBe(ID);
    expect(() => new ZodValidationPipe(UuidParamSchema).transform('1; drop')).toThrow('Datos no validos');
  });
});

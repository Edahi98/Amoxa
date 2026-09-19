import { CierreAccionSchema } from '@validators-acciones/cierre-accion.schema.js';
import { CrearAccionSchema } from '@validators-acciones/crear-accion.schema.js';
import { VerificacionAccionSchema } from '@validators-acciones/verificacion-accion.schema.js';
import { ConclusionesSchema } from '@validators-informes/conclusiones.schema.js';
import { DistribucionSchema } from '@validators-informes/distribucion.schema.js';
import { FirmaSchema } from '@validators-informes/firma.schema.js';

const ID = '11111111-1111-4111-8111-111111111111';

describe('validadores de informes y acciones', () => {
  it('aceptan el cuerpo plano o anidado como lo manda el contexto de la pantalla', () => {
    expect(ConclusionesSchema.parse({ conclusiones: 'Todo bien' })).toEqual({ conclusiones: 'Todo bien' });
    expect(ConclusionesSchema.parse({ informe: { conclusiones: 'Todo bien', firma: '' }, otro: 1 })).toEqual({ conclusiones: 'Todo bien' });
    expect(FirmaSchema.parse({ informe: { firma: 'Ana Líder' } })).toEqual({ firma: 'Ana Líder' });
    expect(FirmaSchema.parse({ firma: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', conclusiones: '' }).conclusiones).toBeUndefined();
    expect(DistribucionSchema.parse({ distribucion: { destinatarios: [ID, { value: ID }] } })).toEqual({ destinatarios: [ID, ID] });
  });

  it('rechazan cadenas con inyección SQL o scripts y datos incompletos', () => {
    expect(ConclusionesSchema.safeParse({ conclusiones: "x'; DROP TABLE informe;--" }).success).toBe(false);
    expect(ConclusionesSchema.safeParse({ conclusiones: '<script>alert(1)</script>' }).success).toBe(false);
    expect(ConclusionesSchema.safeParse({ conclusiones: '  ' }).success).toBe(false);
    expect(FirmaSchema.safeParse({ firma: '<img src=x onerror=alert(1)>' }).success).toBe(false);
    expect(DistribucionSchema.safeParse({ destinatarios: [] }).success).toBe(false);
    expect(DistribucionSchema.safeParse({ destinatarios: ['no-uuid'] }).success).toBe(false);
  });

  it('la creación de acción exige todos los campos', () => {
    const ok = { correccion: 'a', causa_raiz: 'b', responsable_id: ID, fecha_limite: '2026-06-01' };
    expect(CrearAccionSchema.safeParse({ accion: ok }).success).toBe(true);
    for (const missing of ['correccion', 'causa_raiz', 'responsable_id', 'fecha_limite']) {
      expect(CrearAccionSchema.safeParse({ ...ok, [missing]: undefined }).success).toBe(false);
    }
    expect(CrearAccionSchema.safeParse({ ...ok, fecha_limite: '01/06/2026' }).success).toBe(false);
    expect(CrearAccionSchema.safeParse({ ...ok, correccion: 'select * from usuario' }).success).toBe(false);
  });

  it('normalizan las evidencias y rechazan direcciones peligrosas', () => {
    const parsed = CierreAccionSchema.parse({ accion: { evidencias: ['https://x.test/a.pdf', 'foto.png', { name: 'acta.pdf', type: 'doc' }] } });
    expect(parsed).toMatchObject({ evidencias: [{ url: 'https://x.test/a.pdf' }, { nombre: 'foto.png' }, { nombre: 'acta.pdf', tipo: 'doc' }] });
    expect(CierreAccionSchema.parse({}).evidencias).toEqual([]);
    expect(CierreAccionSchema.safeParse({ evidencias: [{ url: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(CierreAccionSchema.safeParse({ evidencias: [{ tipo: 'doc' }] }).success).toBe(false);
  });

  it('la verificación acepta eficaz opcional y nueva fecha', () => {
    const parsed = VerificacionAccionSchema.parse({ verificacion: { eficaz: false, evidencias: ['a.pdf'], nueva_fecha: '2026-07-01' } });
    expect(parsed).toMatchObject({ eficaz: false, nueva_fecha: '2026-07-01' });
    expect(VerificacionAccionSchema.parse({ evidencias: ['a.pdf'], nueva_fecha: '' }).nueva_fecha).toBeUndefined();
  });
});

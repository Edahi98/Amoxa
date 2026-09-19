import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import type { ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';
import { AuditoriaAlcanceProvider } from '@auditorias-providers-auditoria/auditoria-alcance-provider.js';
import { AuditoriaContactoProvider } from '@auditorias-providers-auditoria/auditoria-contacto-provider.js';
import { AuditoriaEquipoProvider } from '@auditorias-providers-auditoria/auditoria-equipo-provider.js';
import { AuditoriaListaProvider } from '@auditorias-providers-auditoria/auditoria-lista-provider.js';
import { AuditoriaPlanAprobarProvider } from '@auditorias-providers-auditoria/auditoria-plan-aprobar-provider.js';
import { AuditoriaPlanProvider } from '@auditorias-providers-auditoria/auditoria-plan-provider.js';

describe('proveedores de datos de las pantallas de planificación', () => {
  let fx: AuditoriaFixture;
  let auditoriaId: string;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
    auditoriaId = (await fx.createAudit()).id;
    await fx.equipo.assign(auditoriaId, { miembros: [fx.auditorA.id] }, fx.token(fx.gestor));
    await fx.plan.save(
      auditoriaId,
      { fecha_inicio: '2099-11-10', fecha_fin: '2099-11-12', agenda: '2099-11-10 Apertura', tareas: 'Ana Auditora: Revisar' },
      fx.token(fx.lider),
    );
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  const request = (screenId: string, role: ScreenDataRequest['role'], user: Parameters<AuditoriaFixture['token']>[0], entityId?: string): ScreenDataRequest => ({
    screenId,
    role,
    user: fx.token(user),
    entityId,
  });

  it('registra un proveedor por cada pantalla de planificación', () => {
    expect(ScreenDataRegistry.providerFor('auditoria.lista')).toBe(AuditoriaListaProvider);
    expect(ScreenDataRegistry.providerFor('auditoria.alcance')).toBe(AuditoriaAlcanceProvider);
    expect(ScreenDataRegistry.providerFor('auditoria.contacto')).toBe(AuditoriaContactoProvider);
    expect(ScreenDataRegistry.providerFor('auditoria.equipo')).toBe(AuditoriaEquipoProvider);
    expect(ScreenDataRegistry.providerFor('auditoria.plan')).toBe(AuditoriaPlanProvider);
    expect(ScreenDataRegistry.providerFor('auditoria.plan_aprobar')).toBe(AuditoriaPlanAprobarProvider);
  });

  it('la lista trae las auditorías del rol con estado', async () => {
    const provider = new AuditoriaListaProvider(fx.access, fx.versions, fx.reader);

    const result = await provider.load(request('auditoria.lista', 'auditor', fx.auditorA));

    expect(result.data?.['auditorias']).toMatchObject([{ id: auditoriaId, estado: 'planificada', plan_estado: 'borrador', procesos: ['Compras'] }]);
    expect((await provider.load(request('auditoria.lista', 'auditor', fx.auditorB))).data?.['auditorias']).toEqual([]);
  });

  it('el alcance trae procesos y solo plantillas vigentes, más la entidad con su estado', async () => {
    const provider = new AuditoriaAlcanceProvider(fx.access, fx.versions, fx.database.db);

    const result = await provider.load(request('auditoria.alcance', 'lider', fx.lider, auditoriaId));

    const opciones = result.data?.['opciones'] as { procesos: { label: string }[]; plantillas: { value: string }[] };
    expect(opciones.procesos.map((item) => item.label)).toEqual(['Compras', 'Ventas']);
    expect(opciones.plantillas.map((item) => item.value)).toEqual([fx.plantillaId]);
    expect(result.data?.['auditoria']).toMatchObject({
      procesos: [fx.procesoCompras],
      criterios: ['9.2'],
      plantilla_id: fx.plantillaId,
      plantilla_estado: 'publicada',
      metodo: 'mixto',
    });
    expect(result.entity).toEqual({ type: 'auditoria', id: auditoriaId, version: expect.any(Number), estado: 'planificada' });
    expect(result.offline?.enabled).toBe(true);
  });

  it('el equipo marca con disabled y su motivo a quienes no pueden participar', async () => {
    const provider = new AuditoriaEquipoProvider(fx.access, fx.versions, fx.database.db);

    const result = await provider.load(request('auditoria.equipo', 'gestor', fx.gestor, auditoriaId));

    const auditores = (result.data?.['opciones'] as { auditores: { value: string; disabled?: boolean; disabledReason?: string }[] }).auditores;
    const byId = new Map(auditores.map((item) => [item.value, item]));
    expect(byId.get(fx.auditorA.id)?.disabled).toBeUndefined();
    expect(byId.get(fx.auditorFormacion.id)?.disabled).toBeUndefined();
    expect(byId.get(fx.auditorB.id)).toMatchObject({ disabled: true, disabledReason: expect.stringContaining('propia área') });
    expect(byId.get(fx.auditorVencido.id)).toMatchObject({ disabled: true, disabledReason: expect.stringContaining('vencida') });
    expect(byId.get(fx.auditorNoApto.id)).toMatchObject({ disabled: true, disabledReason: expect.stringContaining('no apto') });
    expect(result.data?.['equipo']).toEqual({ miembros: [fx.auditorA.id], conflictos: [] });
  });

  it('el equipo se entrega como lista de consulta a quien no es gestor', async () => {
    const provider = new AuditoriaEquipoProvider(fx.access, fx.versions, fx.database.db);

    const result = await provider.load(request('auditoria.equipo', 'lider', fx.lider, auditoriaId));

    expect(result.data?.['opciones']).toBeUndefined();
    expect((result.data?.['equipo'] as { miembros: unknown[] }).miembros).toMatchObject([{ id: fx.auditorA.id, title: 'Ana Auditora' }]);
  });

  it('el contacto trae la viabilidad y la respuesta del área', async () => {
    await fx.contacto.respond(auditoriaId, { respuesta: 'Listos' }, fx.token(fx.auditado));
    const provider = new AuditoriaContactoProvider(fx.access, fx.versions);

    const result = await provider.load(request('auditoria.contacto', 'dueno_proceso', fx.auditado, auditoriaId));

    expect(result.data?.['contacto']).toMatchObject({ informacion_suficiente: false, respuesta: 'Listos' });
  });

  it('el plan trae fechas, agenda, tareas y cronograma', async () => {
    const provider = new AuditoriaPlanProvider(fx.access, fx.versions);

    const result = await provider.load(request('auditoria.plan', 'auditor', fx.auditorA, auditoriaId));

    expect(result.data?.['plan']).toMatchObject({
      estado: 'borrador',
      fecha_inicio: '2099-11-10',
      agenda: '2099-11-10 Apertura',
      tareas: 'Ana Auditora: Revisar',
      cronograma: [
        { id: 'auditoria', start: '2099-11-10', end: '2099-11-12' },
        { id: 'agenda-1', start: '2099-11-10' },
      ],
    });
  });

  it('aprobar plan trae el plan y la propuesta pendiente', async () => {
    await fx.contacto.confirm(auditoriaId, { informacion_suficiente: true, cooperacion: true, tiempo: true }, fx.token(fx.lider));
    await fx.plan.send(auditoriaId, fx.token(fx.lider));
    await fx.plan.propose(auditoriaId, { fecha_propuesta: '2099-12-05', motivo_propuesta: 'Cierre' }, fx.token(fx.auditado));
    const provider = new AuditoriaPlanAprobarProvider(fx.access, fx.versions);

    const result = await provider.load(request('auditoria.plan_aprobar', 'dueno_proceso', fx.auditado, auditoriaId));

    expect(result.data?.['plan']).toMatchObject({ estado: 'con_propuesta', fecha_propuesta: '2099-12-05', motivo_propuesta: 'Cierre' });
    expect(result.entity?.version).toBeGreaterThan(1);
  });

  it('sin entidad devuelve vacío y con una entidad inválida o ajena responde no encontrada', async () => {
    const provider = new AuditoriaPlanProvider(fx.access, fx.versions);

    expect(await provider.load(request('auditoria.plan', 'lider', fx.lider))).toEqual({});
    await expect(provider.load(request('auditoria.plan', 'lider', fx.lider, 'no-es-uuid'))).rejects.toThrow('Auditoría no encontrada');
    await expect(provider.load(request('auditoria.plan', 'gestor', fx.gestorAjeno, auditoriaId))).rejects.toThrow('Auditoría no encontrada');
    await expect(provider.load(request('auditoria.plan', 'dueno_proceso', fx.auditadoAjeno, auditoriaId))).rejects.toThrow('Auditoría no encontrada');
  });
});

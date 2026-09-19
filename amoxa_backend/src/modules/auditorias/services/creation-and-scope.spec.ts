import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';

describe('creación y alcance de auditorías', () => {
  let fx: AuditoriaFixture;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  const scope = (overrides: Record<string, unknown> = {}) => ({
    procesos: [fx.procesoCompras, fx.procesoVentas],
    criterios: ['9.2', '8.4'],
    plantilla_id: fx.plantillaId,
    metodo: 'remoto' as const,
    objetivos: undefined,
    ...overrides,
  });

  it('crea una auditoría en un programa aprobado, versiona y avisa al líder', async () => {
    const detalle = await fx.createAudit();

    expect(detalle.estado).toBe('planificada');
    expect(detalle.procesos.map((item) => item.nombre)).toEqual(['Compras']);
    expect(detalle.plan.estado).toBe('sin_plan');
    expect(await fx.versions.history('auditoria', detalle.id)).toHaveLength(1);
    const avisos = await fx.notifications.listFor(fx.lider.id);
    expect(avisos.some((aviso) => aviso.tipo === 'auditoria_asignada' && aviso.entidadId === detalle.id)).toBe(true);
  });

  it('rechaza crear dentro de un programa que no está aprobado', async () => {
    await expect(
      fx.creator.create(
        fx.programaBorradorId,
        { plantillaId: fx.plantillaId, liderId: fx.lider.id, procesoIds: [fx.procesoCompras], metodo: 'remoto', criterios: [] },
        fx.token(fx.gestor),
      ),
    ).rejects.toMatchObject({ response: { codigo: 'PROGRAMA_NO_APROBADO' } });
  });

  it('rechaza plantillas no vigentes, líderes inválidos y procesos ajenos', async () => {
    const base = { plantillaId: fx.plantillaId, liderId: fx.lider.id, procesoIds: [fx.procesoCompras], metodo: 'remoto' as const, criterios: [] };

    await expect(
      fx.creator.create(fx.programaId, { ...base, plantillaId: fx.plantillaObsoletaId }, fx.token(fx.gestor)),
    ).rejects.toMatchObject({ response: { codigo: 'PLANTILLA_NO_VIGENTE' } });
    await expect(
      fx.creator.create(fx.programaId, { ...base, liderId: fx.auditorA.id }, fx.token(fx.gestor)),
    ).rejects.toMatchObject({ response: { codigo: 'LIDER_INVALIDO' } });
    await expect(
      fx.creator.create(fx.programaId, { ...base, procesoIds: ['0b8f3c1e-4d2a-4b6e-9c1d-5a7e8f9a0b1c'] }, fx.token(fx.gestor)),
    ).rejects.toMatchObject({ response: { codigo: 'PROCESO_INVALIDO' } });
  });

  it('un gestor de otra organización no ve el programa ni la auditoría', async () => {
    const detalle = await fx.createAudit();

    await expect(
      fx.creator.create(
        fx.programaId,
        { plantillaId: fx.plantillaId, liderId: fx.lider.id, procesoIds: [fx.procesoCompras], metodo: 'remoto', criterios: [] },
        fx.token(fx.gestorAjeno),
      ),
    ).rejects.toThrow('Programa no encontrado');
    await expect(fx.access.asManager(detalle.id, fx.token(fx.gestorAjeno))).rejects.toThrow('Auditoría no encontrada');
    expect(await fx.reader.list(fx.token(fx.gestorAjeno), 'gestor')).toEqual([]);
  });

  it('el líder define el alcance, se versiona y se avisa al gestor', async () => {
    const detalle = await fx.createAudit();

    const after = await fx.alcance.define(detalle.id, scope(), fx.token(fx.lider));

    expect(after.procesos.map((item) => item.nombre)).toEqual(['Compras', 'Ventas']);
    expect(after.criterios).toEqual(['9.2', '8.4']);
    expect(after.metodo).toBe('remoto');
    expect(await fx.versions.history('auditoria', detalle.id)).toHaveLength(2);
    const avisos = await fx.notifications.listFor(fx.gestor.id);
    expect(avisos.some((aviso) => aviso.tipo === 'alcance_definido' && aviso.entidadId === detalle.id)).toBe(true);
  });

  it('solo el líder asignado puede definir el alcance', async () => {
    const detalle = await fx.createAudit();

    await expect(fx.alcance.define(detalle.id, scope(), fx.token(fx.otroLider))).rejects.toThrow('líder asignado');
  });

  it('bloquea plantillas no vigentes y alcances incompletos con su código', async () => {
    const detalle = await fx.createAudit();

    await expect(fx.alcance.define(detalle.id, scope({ plantilla_id: fx.plantillaObsoletaId }), fx.token(fx.lider))).rejects.toMatchObject({
      response: { codigo: 'PLANTILLA_NO_VIGENTE' },
    });
    const incompleto = fx.alcance.define(
      detalle.id,
      scope({ procesos: [], criterios: [], plantilla_id: undefined, metodo: undefined }),
      fx.token(fx.lider),
    );
    await expect(incompleto).rejects.toMatchObject({ response: { codigo: 'ALCANCE_SIN_PROCESOS' } });
    await expect(incompleto).rejects.toMatchObject({
      response: { errores: [{ codigo: 'ALCANCE_SIN_PROCESOS' }, { codigo: 'CRITERIOS_VACIOS' }, { codigo: 'PLANTILLA_NO_VIGENTE' }, { codigo: 'METODO_VACIO' }] },
    });
  });

  it('el gestor revisa el alcance, avisa al líder y un cambio posterior invalida la revisión', async () => {
    const detalle = await fx.createAudit();
    await fx.alcance.define(detalle.id, scope(), fx.token(fx.lider));

    const reviewed = await fx.alcance.review(detalle.id, { comentario: 'Conforme' }, fx.token(fx.gestor));

    expect(reviewed.revision?.revisadoEn).not.toBeNull();
    expect(reviewed.revision?.comentario).toBe('Conforme');
    const avisos = await fx.notifications.listFor(fx.lider.id);
    expect(avisos.some((aviso) => aviso.tipo === 'alcance_revisado' && aviso.entidadId === detalle.id)).toBe(true);

    const changed = await fx.alcance.define(detalle.id, scope({ criterios: ['9.2'] }), fx.token(fx.lider));
    expect(changed.revision?.revisadoEn).toBeNull();
  });

  it('no permite revisar un alcance incompleto ni una auditoría de otra organización', async () => {
    const detalle = await fx.createAudit();
    await fx.database.orm.execute(`update auditoria set criterios = '{}' where id = '${detalle.id}'`);

    await expect(fx.alcance.review(detalle.id, {}, fx.token(fx.gestor))).rejects.toMatchObject({ response: { codigo: 'CRITERIOS_VACIOS' } });
    await expect(fx.alcance.review(detalle.id, {}, fx.token(fx.gestorAjeno))).rejects.toThrow('Auditoría no encontrada');
  });

  it('el alcance no cambia si el nuevo alcance deja al equipo en conflicto', async () => {
    const detalle = await fx.createAudit([fx.procesoVentas]);
    await fx.equipo.assign(detalle.id, { miembros: [fx.auditorB.id] }, fx.token(fx.gestor));

    await expect(
      fx.alcance.define(detalle.id, scope({ procesos: [fx.procesoCompras, fx.procesoVentas] }), fx.token(fx.lider)),
    ).rejects.toMatchObject({ response: { codigo: 'EQUIPO_CON_CONFLICTO' } });
    expect((await fx.access.asManager(detalle.id, fx.token(fx.gestor))).procesos).toHaveLength(1);
  });
});

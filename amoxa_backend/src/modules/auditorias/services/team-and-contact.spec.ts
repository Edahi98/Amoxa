import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';

describe('equipo auditor y contacto', () => {
  let fx: AuditoriaFixture;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  it('el gestor asigna el equipo, asigna roles, versiona y avisa', async () => {
    const detalle = await fx.createAudit();

    const after = await fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));

    expect(after.equipo.map((member) => [member.nombre, member.rol])).toEqual([
      ['Ana Auditora', 'auditor'],
      ['Fabi Formacion', 'formacion'],
    ]);
    expect(await fx.versions.history('auditoria', detalle.id)).toHaveLength(2);
    const avisosAuditor = await fx.notifications.listFor(fx.auditorA.id);
    expect(avisosAuditor.some((aviso) => aviso.tipo === 'equipo_asignado' && aviso.entidadId === detalle.id)).toBe(true);
    const avisosLider = await fx.notifications.listFor(fx.lider.id);
    expect(avisosLider.some((aviso) => aviso.tipo === 'equipo_asignado' && aviso.entidadId === detalle.id)).toBe(true);
  });

  it('bloquea a quien audita su propia área con el motivo y registra el intento', async () => {
    const detalle = await fx.createAudit();

    const attempt = fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorB.id] }, fx.token(fx.gestor));

    await expect(attempt).rejects.toMatchObject({
      response: {
        codigo: 'EQUIPO_CON_CONFLICTO',
        conflictos: [{ auditorId: fx.auditorB.id, nombre: 'Beto Auditor' }],
      },
    });
    await expect(attempt).rejects.toThrow('propia área');
    expect((await fx.access.asManager(detalle.id, fx.token(fx.gestor))).equipo).toEqual([]);
    expect(await fx.versions.history('intento_asignacion_equipo', detalle.id)).toHaveLength(1);
  });

  it('bloquea la competencia vencida y al auditor no apto, y avisa quién es', async () => {
    const detalle = await fx.createAudit();

    const attempt = fx.equipo.assign(detalle.id, { miembros: [fx.auditorVencido.id, fx.auditorNoApto.id] }, fx.token(fx.gestor));

    await expect(attempt).rejects.toThrow('Competencia vencida');
    await expect(attempt).rejects.toThrow('no apto');
    await expect(
      fx.equipo.assign(detalle.id, { miembros: ['0b8f3c1e-4d2a-4b6e-9c1d-5a7e8f9a0b1c'] }, fx.token(fx.gestor)),
    ).rejects.toThrow('No es un auditor registrado');
  });

  it('exige al menos un integrante y aísla por organización', async () => {
    const detalle = await fx.createAudit();

    await expect(fx.equipo.assign(detalle.id, { miembros: [] }, fx.token(fx.gestor))).rejects.toMatchObject({
      response: { codigo: 'EQUIPO_VACIO' },
    });
    await expect(fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id] }, fx.token(fx.gestorAjeno))).rejects.toThrow(
      'Auditoría no encontrada',
    );
  });

  it('reasignar el equipo reemplaza a los integrantes retirados', async () => {
    const detalle = await fx.createAudit();
    await fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));

    const after = await fx.equipo.assign(detalle.id, { miembros: [fx.auditorFormacion.id] }, fx.token(fx.gestor));

    expect(after.equipo.map((member) => member.nombre)).toEqual(['Fabi Formacion']);
  });

  it('confirma la viabilidad solo con información, cooperación y tiempo', async () => {
    const detalle = await fx.createAudit();

    await expect(
      fx.contacto.confirm(detalle.id, { informacion_suficiente: true, cooperacion: false, tiempo: true }, fx.token(fx.lider)),
    ).rejects.toMatchObject({ response: { codigo: 'VIABILIDAD_INCOMPLETA' } });
    expect((await fx.access.asManager(detalle.id, fx.token(fx.gestor))).viabilidadOk).toBe(false);

    const after = await fx.contacto.confirm(
      detalle.id,
      { informacion_suficiente: true, cooperacion: true, tiempo: true, observaciones: 'Todo listo' },
      fx.token(fx.lider),
    );

    expect(after.viabilidadOk).toBe(true);
    expect(after.contacto?.observaciones).toBe('Todo listo');
    const avisos = await fx.notifications.listFor(fx.auditado.id);
    expect(avisos.some((aviso) => aviso.tipo === 'contacto_confirmado' && aviso.entidadId === detalle.id)).toBe(true);
    expect((await fx.notifications.listFor(fx.auditadoAjeno.id)).some((aviso) => aviso.entidadId === detalle.id)).toBe(false);
  });

  it('solo el líder asignado confirma la viabilidad', async () => {
    const detalle = await fx.createAudit();

    await expect(
      fx.contacto.confirm(detalle.id, { informacion_suficiente: true, cooperacion: true, tiempo: true }, fx.token(fx.otroLider)),
    ).rejects.toThrow('líder asignado');
  });

  it('el dueño del proceso responde el contacto y el líder es notificado', async () => {
    const detalle = await fx.createAudit();

    const after = await fx.contacto.respond(detalle.id, { respuesta: 'Contamos con la información' }, fx.token(fx.auditado));

    expect(after.contacto?.respuestaArea).toBe('Contamos con la información');
    const avisos = await fx.notifications.listFor(fx.lider.id);
    expect(avisos.some((aviso) => aviso.tipo === 'contacto_respondido' && aviso.entidadId === detalle.id)).toBe(true);
  });

  it('rechaza una respuesta vacía y a un área que no participa', async () => {
    const detalle = await fx.createAudit();

    await expect(fx.contacto.respond(detalle.id, { respuesta: '  ' }, fx.token(fx.auditado))).rejects.toMatchObject({
      response: { codigo: 'RESPUESTA_VACIA' },
    });
    await expect(fx.contacto.respond(detalle.id, { respuesta: 'Hola' }, fx.token(fx.auditadoAjeno))).rejects.toThrow(
      'Auditoría no encontrada',
    );
  });
});

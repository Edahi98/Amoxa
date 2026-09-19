import { desc } from 'drizzle-orm';
import { agendaAuditoria, propuestaFechaPlan } from '@schemas/index.js';
import type { PlanInput } from '@validators-auditorias-plan/plan.schema.js';
import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';

describe('plan de auditoría', () => {
  let fx: AuditoriaFixture;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  const plan = (overrides: PlanInput = {}): PlanInput => ({
    fecha_inicio: '2099-11-10',
    fecha_fin: '2099-11-12',
    agenda: '2099-11-10 Reunión de apertura\nRevisión de compras',
    tareas: 'Ana Auditora: Revisar compras\nFabi Formacion: Apoyo documental',
    ...overrides,
  });

  const prepared = async (confirm = true) => {
    const detalle = await fx.createAudit();
    await fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));
    if (confirm) {
      await fx.contacto.confirm(detalle.id, { informacion_suficiente: true, cooperacion: true, tiempo: true }, fx.token(fx.lider));
    }
    return detalle;
  };

  it('guarda el plan como borrador con agenda y tareas por integrante', async () => {
    const detalle = await prepared();

    const saved = await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));

    expect(saved.plan.estado).toBe('borrador');
    expect(saved.plan.agenda.map((entry) => entry.actividad)).toEqual(['Reunión de apertura', 'Revisión de compras']);
    expect(saved.plan.tareas.map((task) => task.auditorId)).toEqual([fx.auditorA.id, fx.auditorFormacion.id]);
    expect(saved.fechaPlan).toBe('2099-11-10');
  });

  it('conserva las versiones anteriores de la agenda al volver a guardar', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));

    const second = await fx.plan.save(detalle.id, plan({ agenda: 'Una sola actividad' }), fx.token(fx.lider));

    expect(second.plan.version).toBe(2);
    expect(second.plan.agenda).toHaveLength(1);
    const rows = await fx.database.orm.select().from(agendaAuditoria).orderBy(desc(agendaAuditoria.planVersion));
    expect(rows.filter((row) => row.auditoriaId === detalle.id)).toHaveLength(3);
  });

  it('un guardado parcial conserva lo que no se envía', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));

    const partial = await fx.plan.save(detalle.id, { fecha_fin: '2099-11-13' }, fx.token(fx.lider));

    expect(partial.plan.fechaFin).toBe('2099-11-13');
    expect(partial.plan.agenda).toHaveLength(2);
    expect(partial.plan.tareas).toHaveLength(2);
  });

  it('rechaza tareas para quien no está en el equipo y fechas invertidas', async () => {
    const detalle = await prepared();

    await expect(fx.plan.save(detalle.id, plan({ tareas: 'Beto Auditor: Algo' }), fx.token(fx.lider))).rejects.toMatchObject({
      response: { codigo: 'TAREAS_SIN_INTEGRANTE' },
    });
    await expect(fx.plan.save(detalle.id, plan({ fecha_fin: '2099-11-01' }), fx.token(fx.lider))).rejects.toMatchObject({
      response: { codigo: 'PLAN_SIN_FECHAS' },
    });
  });

  it('no envía un plan que no existe, incompleto o sin viabilidad confirmada', async () => {
    const detalle = await prepared();
    await expect(fx.plan.send(detalle.id, fx.token(fx.lider))).rejects.toMatchObject({ response: { codigo: 'PLAN_ESTADO_INVALIDO' } });

    await fx.plan.save(detalle.id, { fecha_inicio: '2099-11-10' }, fx.token(fx.lider));
    const incomplete = fx.plan.send(detalle.id, fx.token(fx.lider));
    await expect(incomplete).rejects.toMatchObject({
      response: { errores: [{ codigo: 'PLAN_SIN_FECHAS' }, { codigo: 'PLAN_SIN_AGENDA' }, { codigo: 'PLAN_SIN_TAREAS' }] },
    });

    const noViability = await prepared(false);
    await fx.plan.save(noViability.id, plan(), fx.token(fx.lider));
    await expect(fx.plan.send(noViability.id, fx.token(fx.lider))).rejects.toMatchObject({ response: { codigo: 'VIABILIDAD_PENDIENTE' } });
  });

  it('envía el plan y notifica al dueño del proceso y al equipo', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));

    const sent = await fx.plan.send(detalle.id, fx.token(fx.lider));

    expect(sent.plan.estado).toBe('enviado');
    expect(sent.plan.enviadoEn).not.toBeNull();
    const owner = await fx.notifications.listFor(fx.auditado.id);
    expect(owner.some((aviso) => aviso.tipo === 'plan_enviado' && aviso.entidadId === detalle.id)).toBe(true);
    const team = await fx.notifications.listFor(fx.auditorA.id);
    expect(team.some((aviso) => aviso.tipo === 'plan_disponible' && aviso.entidadId === detalle.id)).toBe(true);
    expect((await fx.notifications.listFor(fx.auditadoAjeno.id)).some((aviso) => aviso.entidadId === detalle.id)).toBe(false);
    await expect(fx.plan.send(detalle.id, fx.token(fx.lider))).rejects.toMatchObject({ response: { codigo: 'PLAN_ESTADO_INVALIDO' } });
  });

  it('el dueño propone otra fecha y el líder ve la respuesta de inmediato', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));
    await fx.plan.send(detalle.id, fx.token(fx.lider));

    await expect(fx.plan.propose(detalle.id, {}, fx.token(fx.auditado))).rejects.toMatchObject({ response: { codigo: 'PROPUESTA_SIN_FECHA' } });
    await expect(fx.plan.propose(detalle.id, { fecha_propuesta: '2020-01-01' }, fx.token(fx.auditado))).rejects.toMatchObject({
      response: { codigo: 'PROPUESTA_FECHA_PASADA' },
    });

    const proposed = await fx.plan.propose(detalle.id, { fecha_propuesta: '2099-12-01', motivo_propuesta: 'Cierre de mes' }, fx.token(fx.auditado));

    expect(proposed.plan.estado).toBe('con_propuesta');
    expect(proposed.propuestas).toMatchObject([{ fechaPropuesta: '2099-12-01', motivo: 'Cierre de mes', estado: 'pendiente' }]);
    const avisos = await fx.notifications.listFor(fx.lider.id);
    expect(avisos.some((aviso) => aviso.tipo === 'plan_propuesta_fecha' && aviso.mensaje.includes('2099-12-01'))).toBe(true);
    await expect(fx.plan.approve(detalle.id, fx.token(fx.auditado))).rejects.toMatchObject({ response: { codigo: 'PLAN_ESTADO_INVALIDO' } });
  });

  it('tras una propuesta el líder ajusta, reenvía y la propuesta queda atendida', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));
    await fx.plan.send(detalle.id, fx.token(fx.lider));
    await fx.plan.propose(detalle.id, { fecha_propuesta: '2099-12-01' }, fx.token(fx.auditado));

    const adjusted = await fx.plan.save(detalle.id, plan({ fecha_inicio: '2099-12-01', fecha_fin: '2099-12-03' }), fx.token(fx.lider));
    expect(adjusted.plan.estado).toBe('borrador');
    const resent = await fx.plan.send(detalle.id, fx.token(fx.lider));

    expect(resent.plan.estado).toBe('enviado');
    expect(resent.propuestas.every((item) => item.estado === 'atendida')).toBe(true);
    const rows = await fx.database.orm.select().from(propuestaFechaPlan);
    expect(rows.filter((row) => row.auditoriaId === detalle.id)).toHaveLength(1);
  });

  it('el dueño aprueba el plan y queda inmutable', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));
    await fx.plan.send(detalle.id, fx.token(fx.lider));

    await expect(fx.plan.approve(detalle.id, fx.token(fx.auditadoAjeno))).rejects.toThrow('Auditoría no encontrada');
    const approved = await fx.plan.approve(detalle.id, fx.token(fx.auditado));

    expect(approved.plan.estado).toBe('aprobado');
    expect(approved.planAprobado).toBe(true);
    const avisos = await fx.notifications.listFor(fx.lider.id);
    expect(avisos.some((aviso) => aviso.tipo === 'plan_aprobado' && aviso.entidadId === detalle.id)).toBe(true);
    await expect(fx.plan.save(detalle.id, plan(), fx.token(fx.lider))).rejects.toMatchObject({ response: { codigo: 'PLAN_BLOQUEADO' } });
    await expect(fx.plan.approve(detalle.id, fx.token(fx.auditado))).rejects.toMatchObject({ response: { codigo: 'PLAN_ESTADO_INVALIDO' } });
    await expect(fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id] }, fx.token(fx.gestor))).rejects.toMatchObject({
      response: { codigo: 'EQUIPO_BLOQUEADO' },
    });
  });

  it('no permite retirar del equipo a quien tiene tareas en el plan', async () => {
    const detalle = await prepared();
    await fx.plan.save(detalle.id, plan(), fx.token(fx.lider));

    await expect(fx.equipo.assign(detalle.id, { miembros: [fx.auditorFormacion.id] }, fx.token(fx.gestor))).rejects.toMatchObject({
      response: { codigo: 'EQUIPO_CON_TAREAS' },
    });
  });

  it('no permite cambiar el plan de una auditoría que ya no está planificada', async () => {
    const detalle = await prepared();
    await fx.database.orm.execute(`update auditoria set estado = 'en_curso' where id = '${detalle.id}'`);

    await expect(fx.plan.save(detalle.id, plan(), fx.token(fx.lider))).rejects.toMatchObject({
      response: { codigo: 'AUDITORIA_NO_PLANIFICABLE' },
    });
  });
});

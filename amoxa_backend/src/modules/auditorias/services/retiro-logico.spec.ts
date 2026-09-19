import { and, eq } from 'drizzle-orm';
import { auditoriaProceso, equipoAuditoria } from '@schemas/index.js';
import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';

describe('retiro lógico de equipo y alcance', () => {
  let fx: AuditoriaFixture;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  const scope = (procesos: string[]) => ({
    procesos,
    criterios: ['9.2'],
    plantilla_id: fx.plantillaId,
    metodo: 'remoto' as const,
    objetivos: undefined,
  });

  const teamRows = (auditoriaId: string) => fx.database.orm.select().from(equipoAuditoria).where(eq(equipoAuditoria.auditoriaId, auditoriaId));
  const scopeRows = (auditoriaId: string) => fx.database.orm.select().from(auditoriaProceso).where(eq(auditoriaProceso.auditoriaId, auditoriaId));

  it('retirar a un integrante conserva la fila con su fecha de retiro y las lecturas lo ignoran', async () => {
    const detalle = await fx.createAudit();
    await fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));
    expect((await fx.reader.list(fx.token(fx.auditorA), 'auditor')).map((item) => item.id)).toContain(detalle.id);

    const after = await fx.equipo.assign(detalle.id, { miembros: [fx.auditorFormacion.id] }, fx.token(fx.gestor));

    expect(after.equipo.map((member) => member.nombre)).toEqual(['Fabi Formacion']);
    const rows = await teamRows(detalle.id);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.auditorId === fx.auditorA.id)?.retiradoEn).toBeInstanceOf(Date);
    expect(rows.find((row) => row.auditorId === fx.auditorFormacion.id)?.retiradoEn).toBeNull();
    expect((await fx.reader.list(fx.token(fx.auditorA), 'auditor')).map((item) => item.id)).not.toContain(detalle.id);
    expect((await fx.reader.load(detalle.id, fx.organizacionId)).equipo.map((member) => member.auditorId)).toEqual([fx.auditorFormacion.id]);
  });

  it('volver a incluir a un integrante retirado lo reactiva en lugar de insertar otra fila', async () => {
    const detalle = await fx.createAudit();
    await fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));
    await fx.equipo.assign(detalle.id, { miembros: [fx.auditorFormacion.id] }, fx.token(fx.gestor));

    const after = await fx.equipo.assign(detalle.id, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));

    expect(after.equipo.map((member) => member.nombre)).toEqual(['Ana Auditora', 'Fabi Formacion']);
    const rows = await teamRows(detalle.id);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.retiradoEn === null)).toBe(true);
    expect(rows.find((row) => row.auditorId === fx.auditorA.id)?.rol).toBe('auditor');
    expect(await fx.versions.history('auditoria', detalle.id)).toHaveLength(4);
  });

  it('retirar un proceso del alcance conserva la fila y los visibles lo ignoran', async () => {
    const detalle = await fx.createAudit([fx.procesoVentas]);
    expect((await fx.reader.list(fx.token(fx.auditadoAjeno), 'dueno_proceso')).map((item) => item.id)).toContain(detalle.id);

    const after = await fx.alcance.define(detalle.id, scope([fx.procesoCompras]), fx.token(fx.lider));

    expect(after.procesos.map((item) => item.nombre)).toEqual(['Compras']);
    const rows = await scopeRows(detalle.id);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.procesoId === fx.procesoVentas)?.retiradoEn).toBeInstanceOf(Date);
    expect(rows.find((row) => row.procesoId === fx.procesoCompras)?.retiradoEn).toBeNull();
    expect((await fx.reader.list(fx.token(fx.auditadoAjeno), 'dueno_proceso')).map((item) => item.id)).not.toContain(detalle.id);
    expect((await fx.reader.list(fx.token(fx.gestor), 'gestor')).find((item) => item.id === detalle.id)?.procesos).toEqual([
      { id: fx.procesoCompras, nombre: 'Compras' },
    ]);
  });

  it('volver a incluir un proceso retirado lo reactiva', async () => {
    const detalle = await fx.createAudit([fx.procesoVentas]);
    await fx.alcance.define(detalle.id, scope([fx.procesoCompras]), fx.token(fx.lider));

    const after = await fx.alcance.define(detalle.id, scope([fx.procesoCompras, fx.procesoVentas]), fx.token(fx.lider));

    expect(after.procesos.map((item) => item.nombre)).toEqual(['Compras', 'Ventas']);
    const rows = await scopeRows(detalle.id);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.retiradoEn === null)).toBe(true);
    const ventas = await fx.database.orm
      .select()
      .from(auditoriaProceso)
      .where(and(eq(auditoriaProceso.auditoriaId, detalle.id), eq(auditoriaProceso.procesoId, fx.procesoVentas)));
    expect(ventas).toHaveLength(1);
  });

  it('la elegibilidad del equipo ignora los procesos retirados del alcance', async () => {
    const detalle = await fx.createAudit([fx.procesoCompras]);
    await expect(fx.equipo.assign(detalle.id, { miembros: [fx.auditorB.id] }, fx.token(fx.gestor))).rejects.toMatchObject({
      response: { codigo: 'EQUIPO_CON_CONFLICTO' },
    });

    await fx.alcance.define(detalle.id, scope([fx.procesoVentas]), fx.token(fx.lider));
    const after = await fx.equipo.assign(detalle.id, { miembros: [fx.auditorB.id] }, fx.token(fx.gestor));

    expect(after.equipo.map((member) => member.auditorId)).toEqual([fx.auditorB.id]);
  });
});

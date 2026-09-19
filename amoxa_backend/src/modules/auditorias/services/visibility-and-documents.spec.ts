import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { AuditoriaFixture } from '@testing-auditorias/auditoria-fixture.js';

describe('visibilidad por rol y documentos', () => {
  let fx: AuditoriaFixture;
  let compras: string;
  let ventas: string;

  beforeAll(async () => {
    fx = await AuditoriaFixture.create();
    const first = await fx.createAudit([fx.procesoCompras]);
    const second = await fx.createAudit([fx.procesoVentas]);
    compras = first.id;
    ventas = second.id;
    await fx.equipo.assign(compras, { miembros: [fx.auditorA.id, fx.auditorFormacion.id] }, fx.token(fx.gestor));
    await fx.contacto.confirm(compras, { informacion_suficiente: true, cooperacion: true, tiempo: true }, fx.token(fx.lider));
    await fx.plan.save(
      compras,
      {
        fecha_inicio: '2099-11-10',
        fecha_fin: '2099-11-12',
        agenda: '2099-11-10 Reunión de apertura\nRevisión de compras',
        tareas: 'Ana Auditora: Revisar compras\nFabi Formacion: Apoyo documental',
      },
      fx.token(fx.lider),
    );
  }, 60000);

  afterAll(async () => {
    await fx.close();
  });

  it('el gestor y el líder ven todas las auditorías de su organización', async () => {
    expect((await fx.reader.list(fx.token(fx.gestor), 'gestor')).map((item) => item.id).sort()).toEqual([compras, ventas].sort());
    expect(await fx.reader.list(fx.token(fx.lider), 'lider')).toHaveLength(2);
  });

  it('el auditor solo ve las auditorías en las que está asignado', async () => {
    expect((await fx.reader.list(fx.token(fx.auditorA), 'auditor')).map((item) => item.id)).toEqual([compras]);
    expect(await fx.reader.list(fx.token(fx.auditorB), 'auditor')).toEqual([]);
    await expect(fx.access.visible(ventas, fx.token(fx.auditorA), 'auditor')).rejects.toThrow('Auditoría no encontrada');
  });

  it('el dueño del proceso solo ve las auditorías que involucran su área', async () => {
    expect((await fx.reader.list(fx.token(fx.auditado), 'dueno_proceso')).map((item) => item.id)).toEqual([compras]);
    expect((await fx.reader.list(fx.token(fx.auditadoAjeno), 'dueno_proceso')).map((item) => item.id)).toEqual([ventas]);
    await expect(fx.access.visible(ventas, fx.token(fx.auditado), 'dueno_proceso')).rejects.toThrow('Auditoría no encontrada');
  });

  it('la lista trae estado, procesos y estado del plan, y admite filtrar por programa', async () => {
    const [item] = (await fx.reader.list(fx.token(fx.auditorA), 'auditor')) ?? [];

    expect(item).toMatchObject({ estado: 'planificada', planEstado: 'borrador', periodo: '2026', liderNombre: 'Laura Lider' });
    expect(item.procesos.map((process) => process.nombre)).toEqual(['Compras']);
    expect(await fx.reader.list(fx.token(fx.gestor), 'gestor', { programaId: fx.programaBorradorId })).toEqual([]);
    expect(await fx.reader.list(fx.token(fx.gestor), 'gestor', { programaId: fx.programaId })).toHaveLength(2);
  });

  it('otra organización no ve ninguna auditoría', async () => {
    expect(await fx.reader.list(fx.token(fx.gestorAjeno), 'gestor')).toEqual([]);
    await expect(fx.access.visible(compras, fx.token(fx.gestorAjeno), 'gestor')).rejects.toThrow('Auditoría no encontrada');
  });

  it('genera el plan de auditoría con objetivo, alcance, equipo, agenda, tareas y firmas', async () => {
    const file = await fx.documents.plan(compras, fx.token(fx.auditorA), 'auditor');
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toMatch(/^plan-auditoria-.*\.docx$/);
    for (const expected of [
      'Plan de auditoría',
      'Objetivo',
      'Compras',
      '9.2',
      'Mixto',
      'Laura Lider',
      'Ana Auditora',
      'Fabi Formacion',
      'Auditor en formación',
      '2099-11-10',
      'Reunión de apertura',
      'Revisar compras',
      'Apoyo documental',
      'en borrador',
      'Responsable del área auditada',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('genera la notificación de auditoría dirigida al área con fechas, alcance y equipo', async () => {
    const file = await fx.documents.notification(compras, fx.token(fx.auditado), 'dueno_proceso');
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toMatch(/^notificacion-auditoria-.*\.docx$/);
    for (const expected of ['Notificación de auditoría', 'Compras', 'del 2099-11-10 al 2099-11-12', 'mixto', 'Ana Auditora', 'Laura Lider', 'ISO 9001:2015']) {
      expect(text).toContain(expected);
    }
  });

  it('los documentos respetan la visibilidad por rol', async () => {
    await expect(fx.documents.plan(ventas, fx.token(fx.auditorA), 'auditor')).rejects.toThrow('Auditoría no encontrada');
    await expect(fx.documents.notification(compras, fx.token(fx.auditadoAjeno), 'dueno_proceso')).rejects.toThrow('Auditoría no encontrada');
  });
});

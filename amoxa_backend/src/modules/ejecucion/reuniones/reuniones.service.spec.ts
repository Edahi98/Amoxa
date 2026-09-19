import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { auditoria, hallazgo, informacionDocumentada, notificacion } from '@db/schema/index.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { EjecucionHarness } from '@testing-ejecucion/ejecucion-harness.js';
import { EjecucionSeed, type EjecucionScenario } from '@testing-ejecucion/ejecucion-seed.js';

describe('Reuniones de apertura y cierre', () => {
  let database: TestDatabase;
  let harness: EjecucionHarness;
  let dir: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    dir = await mkdtemp(join(tmpdir(), 'amoxa-reuniones-'));
    harness = new EjecucionHarness(database, dir);
  }, 60000);

  afterAll(async () => {
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  describe('apertura', () => {
    it('exige asistentes y aprobación del plan, y solo el líder de la auditoría puede abrir', async () => {
      const planificada = await EjecucionSeed.create(database, { estado: 'planificada' });
      const lider = TokenFactory.of(planificada.lider);

      await expect(harness.apertura.register(planificada.auditoriaId, lider, { asistentes: [] })).rejects.toMatchObject({
        status: 422,
        response: { code: 'ASISTENTES_VACIO' },
      });
      await expect(
        harness.apertura.register(planificada.auditoriaId, lider, { asistentes: [planificada.lider.id] }),
      ).rejects.toMatchObject({ status: 422, response: { code: 'ASISTENTES_VACIO' } });
      await expect(
        harness.apertura.register(planificada.auditoriaId, TokenFactory.of(planificada.ajeno), { asistentes: [planificada.auditor.id] }),
      ).rejects.toMatchObject({ status: 403 });

      const sinPlan = await EjecucionSeed.create(database, { estado: 'planificada', planAprobado: false });
      await expect(
        harness.apertura.register(sinPlan.auditoriaId, TokenFactory.of(sinPlan.lider), { asistentes: [sinPlan.auditor.id] }),
      ).rejects.toMatchObject({ status: 422 });
      const [unchanged] = await database.orm.select().from(auditoria).where(eq(auditoria.id, sinPlan.auditoriaId));
      expect(unchanged.estado).toBe('planificada');
    });

    it('registra asistentes, pasa la auditoría a en curso, notifica y versiona', async () => {
      const scenario = await EjecucionSeed.create(database, { estado: 'planificada' });
      const view = await harness.apertura.register(scenario.auditoriaId, TokenFactory.of(scenario.lider), {
        asistentes: [scenario.auditor.id, scenario.auditado.id, scenario.auditor.id],
        notas: 'Se acordó el calendario',
      });

      expect(view.registrada).toBe(true);
      expect(view.notas).toBe('Se acordó el calendario');
      expect(view.asistentes).toHaveLength(3);
      expect(view.asistentes.find((item) => item.usuarioId === scenario.lider.id)?.rolReunion).toBe('preside');
      const [row] = await database.orm.select().from(auditoria).where(eq(auditoria.id, scenario.auditoriaId));
      expect(row.estado).toBe('en_curso');
      expect(row.fechaReal).not.toBeNull();
      const notified = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, scenario.auditado.id));
      expect(notified.map((item) => item.tipo)).toContain('reunion_apertura');
      const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, scenario.auditoriaId));
      expect(versions).toHaveLength(1);
      await expect(
        harness.apertura.register(scenario.auditoriaId, TokenFactory.of(scenario.lider), { asistentes: [scenario.auditor.id] }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('rechaza asistentes de otra organización', async () => {
      const scenario = await EjecucionSeed.create(database, { estado: 'planificada' });
      const otra = await TestSeed.organizacion(database, 'Ajena');
      const extraño = await TestSeed.usuario(database, otra, 'auditor');

      await expect(
        harness.apertura.register(scenario.auditoriaId, TokenFactory.of(scenario.lider), { asistentes: [extraño.id] }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('permite confirmar asistencia solo después de registrada la apertura', async () => {
      const scenario = await EjecucionSeed.create(database, { estado: 'planificada' });
      await expect(harness.apertura.confirm(scenario.auditoriaId, TokenFactory.of(scenario.auditor))).rejects.toMatchObject({ status: 422 });

      await harness.apertura.register(scenario.auditoriaId, TokenFactory.of(scenario.lider), { asistentes: [scenario.auditor.id, scenario.auditado.id] });
      const auditorView = await harness.apertura.confirm(scenario.auditoriaId, TokenFactory.of(scenario.auditor));
      const duenoView = await harness.apertura.confirm(scenario.auditoriaId, TokenFactory.of(scenario.auditado));

      expect(auditorView.asistentes.find((item) => item.usuarioId === scenario.auditor.id)?.confirmadaEn).not.toBeNull();
      expect(duenoView.asistentes.find((item) => item.usuarioId === scenario.auditado.id)?.confirmadaEn).not.toBeNull();
      expect(duenoView.asistentes.find((item) => item.usuarioId === scenario.segundoAuditor.id)).toBeUndefined();
    });

    it('lista como candidatos al equipo y a los dueños de proceso, sin el líder', async () => {
      const scenario = await EjecucionSeed.create(database, { estado: 'planificada' });
      const context = await harness.access.load(scenario.auditoriaId, TokenFactory.of(scenario.lider));
      const candidates = await harness.reuniones.candidates(context);

      expect(candidates.map((item) => item.id).sort()).toEqual([scenario.auditor.id, scenario.segundoAuditor.id, scenario.auditado.id].sort());
    });
  });

  describe('cierre', () => {
    let scenario: EjecucionScenario;
    let nc: string;
    let om: string;

    const lider = () => TokenFactory.of(scenario.lider);
    const dueno = () => TokenFactory.of(scenario.auditado);

    beforeAll(async () => {
      scenario = await EjecucionSeed.create(database);
      const auditor = TokenFactory.of(scenario.auditor);
      await harness.checklist.save(scenario.auditoriaId, auditor, { respuestas: { q1: { result: 'no_conforme' } } });
      const view = await harness.checklist.view(scenario.auditoriaId, auditor);
      const answer = view.preguntas[0].respuesta!.id;
      await harness.evidence.storeDeclared(scenario.auditoriaId, answer, auditor, {
        archivos: [{ id: 'c1', name: 'foto.png', size: 10, mimeType: 'image/png' }],
      });
      await harness.evidence.verify(scenario.auditoriaId, answer, auditor);
      nc = (await harness.hallazgos.create(scenario.auditoriaId, auditor, { tipo: 'nc_mayor', respuesta_id: answer, clausula: '5.2', descripcion: 'Política no comunicada' })).id;
      om = (await harness.hallazgos.create(scenario.auditoriaId, auditor, { tipo: 'oportunidad', respuesta_id: answer, descripcion: 'Mejorar la difusión' })).id;
    }, 60000);

    it('no permite cerrar mientras haya hallazgos sin revisar', async () => {
      await expect(harness.cierre.close(scenario.auditoriaId, lider(), { asistentes: [] })).rejects.toMatchObject({
        status: 422,
        response: { code: 'HALLAZGOS_SIN_REVISAR' },
      });
      const [row] = await database.orm.select().from(auditoria).where(eq(auditoria.id, scenario.auditoriaId));
      expect(row.estado).toBe('en_curso');
    });

    it('exige el resultado del área al anotar la revisión y solo cuenta la del cierre', async () => {
      await expect(
        harness.cierre.annotateReview(scenario.auditoriaId, lider(), { hallazgo_id: nc }),
      ).rejects.toMatchObject({ status: 422, response: { code: 'REVISION_SIN_RESULTADO' } });

      await harness.hallazgos.review(om, lider(), { comentario: 'Revisión previa' });
      await expect(harness.cierre.close(scenario.auditoriaId, lider(), { asistentes: [] })).rejects.toMatchObject({ status: 422 });

      const first = await harness.cierre.annotateReview(scenario.auditoriaId, lider(), { hallazgo_id: nc, resultado_area: 'aceptado', comentario: 'De acuerdo' });
      expect(first.pendientes).toBe(1);
    });

    it('el dueño del proceso acepta o discrepa sin modificar el hallazgo', async () => {
      await expect(
        harness.cierre.discrepar(scenario.auditoriaId, dueno(), { hallazgo_id: om }),
      ).rejects.toMatchObject({ status: 422, response: { code: 'DISCREPANCIA_SIN_MOTIVO' } });
      const [before] = await database.orm.select().from(hallazgo).where(eq(hallazgo.id, om));

      await harness.cierre.discrepar(scenario.auditoriaId, dueno(), { hallazgo_id: om, motivo_discrepancia: 'No corresponde a mi proceso' });
      const [after] = await database.orm.select().from(hallazgo).where(eq(hallazgo.id, om));

      expect(after.descripcion).toBe(before.descripcion);
      expect(after.tipo).toBe(before.tipo);
      expect(after.criterioIncumplido).toBe(before.criterioIncumplido);
      expect(after.confirmado).toBe(false);
      expect(after.discrepancia).toBe('No corresponde a mi proceso');
      const notices = await database.orm.select().from(notificacion).where(and(eq(notificacion.usuarioId, scenario.lider.id), eq(notificacion.tipo, 'hallazgo_discrepancia')));
      expect(notices).toHaveLength(1);

      const accepted = await harness.cierre.accept(scenario.auditoriaId, dueno(), {});
      expect(accepted.hallazgos.sort()).toEqual([nc, om].sort());
      const [confirmed] = await database.orm.select().from(hallazgo).where(eq(hallazgo.id, om));
      expect(confirmed).toMatchObject({ confirmado: true, discrepancia: null });
    });

    it('impide que otro dueño de proceso decida sobre hallazgos ajenos', async () => {
      const otroDueno = await TestSeed.usuario(database, scenario.organizacionId, 'auditado');

      await expect(harness.cierre.accept(scenario.auditoriaId, TokenFactory.of(otroDueno), {})).rejects.toMatchObject({ status: 403 });
    });

    it('registra la asistencia opcional del auditor al cierre', async () => {
      const view = await harness.cierre.attend(scenario.auditoriaId, TokenFactory.of(scenario.auditor));

      expect(view.tipo).toBe('cierre');
      expect(view.asistentes.map((item) => item.usuarioId)).toContain(scenario.auditor.id);
    });

    it('cierra la auditoría, notifica al líder y a la dirección y crea versión', async () => {
      await harness.cierre.annotateReview(scenario.auditoriaId, lider(), { hallazgo_id: om, resultado_area: 'discrepa', comentario: 'Se mantiene' });
      const result = await harness.cierre.close(scenario.auditoriaId, lider(), { asistentes: [], notas: 'Cierre sin observaciones adicionales' });

      expect(result.estado).toBe('cerrada');
      expect(result.reunion.notas).toBe('Cierre sin observaciones adicionales');
      const [row] = await database.orm.select().from(auditoria).where(eq(auditoria.id, scenario.auditoriaId));
      expect(row.estado).toBe('cerrada');
      const toLeader = await database.orm.select().from(notificacion).where(and(eq(notificacion.usuarioId, scenario.lider.id), eq(notificacion.tipo, 'auditoria_cerrada')));
      const toBoard = await database.orm.select().from(notificacion).where(and(eq(notificacion.usuarioId, scenario.admin.id), eq(notificacion.tipo, 'auditoria_cerrada')));
      expect(toLeader).toHaveLength(1);
      expect(toBoard).toHaveLength(1);
      const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, scenario.auditoriaId));
      expect(versions.length).toBeGreaterThanOrEqual(1);
      await expect(harness.cierre.close(scenario.auditoriaId, lider(), { asistentes: [] })).rejects.toMatchObject({ status: 422 });
    });

    it('puede cerrarse una auditoría sin hallazgos y respeta la organización', async () => {
      const limpia = await EjecucionSeed.create(database);
      const otra = await EjecucionSeed.create(database);

      await expect(harness.cierre.close(limpia.auditoriaId, TokenFactory.of(otra.lider), { asistentes: [] })).rejects.toMatchObject({ status: 404 });
      const result = await harness.cierre.close(limpia.auditoriaId, TokenFactory.of(limpia.lider), { asistentes: [] });
      expect(result.estado).toBe('cerrada');
    });
  });
});

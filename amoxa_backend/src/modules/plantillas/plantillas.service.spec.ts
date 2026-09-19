import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { informacionDocumentada, notificacion, plantillaChecklist, propuestaPregunta } from '@db/schema/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { PlantillaBodySchema } from '@validators-plantillas/plantilla-body.schema.js';
import { PreguntaBodySchema } from '@validators-plantillas/pregunta-body.schema.js';
import { PlantillaDocumentService } from '@plantillas-services-plantilla/plantilla-document.service.js';
import { PlantillaQueryService } from '@plantillas-services-plantilla/plantilla-query.service.js';
import { PlantillasService } from '@plantillas-services/plantillas.service.js';
import { PlantillaScreenDataProvider } from '@plantillas-screens/plantilla-screen-data.provider.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';

const token = (user: SeededUser): TokenPayload => ({
  sub: user.id,
  organizacionId: user.organizacionId,
  email: `${user.rol}@amoxa.test`,
  rol: user.rol,
  issuedAt: '2026-01-01T00:00:00.000Z',
});

const plantillaBody = (nombre: string) => PlantillaBodySchema.parse({ plantilla: { nombre } }) as { nombre: string };
const preguntaBody = (texto: string, clausula: string, criterio: string) =>
  PreguntaBodySchema.parse({ pregunta: { texto, clausula, criterio } }) as Parameters<PlantillasService['addQuestion']>[2];

describe('PlantillasService', () => {
  let database: TestDatabase;
  let service: PlantillasService;
  let query: PlantillaQueryService;
  let gestor: TokenPayload;
  let lider: TokenPayload;
  let otroGestor: TokenPayload;
  let plantillaId: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    const organizacionId = await TestSeed.organizacion(database);
    gestor = token(await TestSeed.usuario(database, organizacionId, 'gestor_programa'));
    lider = token(await TestSeed.usuario(database, organizacionId, 'lider_auditor'));
    const otra = await TestSeed.organizacion(database, 'Otra organización');
    otroGestor = token(await TestSeed.usuario(database, otra, 'gestor_programa'));
    query = new PlantillaQueryService(database.db);
    service = new PlantillasService(database.db, query, new RecordVersionService(database.db), new NotificationService(database.db));
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('crea una plantilla en borrador que todavía no es elegible y la versiona', async () => {
    const created = await service.create(gestor, plantillaBody('Checklist 9.2'));
    plantillaId = created.id;

    expect(created.estado).toBe('borrador');
    expect(created.vigente).toBe(false);
    expect(created.version).toBe(1);
    expect(created.cobertura.completa).toBe(false);
    expect(await query.isEligible(plantillaId, gestor.organizacionId)).toBe(false);
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, plantillaId));
    expect(versions).toHaveLength(1);
  });

  it('agrega preguntas con cláusula y tipo de criterio, numeradas en orden', async () => {
    await service.addQuestion(plantillaId, gestor, preguntaBody('¿La política de la calidad es conocida?', '5.2', 'norma'));
    const view = await service.addQuestion(plantillaId, gestor, preguntaBody('¿Se sigue el procedimiento de compras?', 'propio', 'procedimiento'));

    expect(view.preguntas.map((question) => [question.orden, question.clausula, question.criterio])).toEqual([
      [1, '5.2', 'norma'],
      [2, 'propio', 'procedimiento'],
    ]);
  });

  it('no publica si falta cobertura y devuelve el detalle de lo faltante', async () => {
    const soloIso = await service.create(gestor, plantillaBody('Solo ISO'));
    await service.addQuestion(soloIso.id, gestor, preguntaBody('¿Se controla la información documentada?', '7.5', 'norma'));

    const attempt = service.publish(soloIso.id, gestor);

    await expect(attempt).rejects.toBeInstanceOf(UnprocessableEntityException);
    const error = (await attempt.catch((caught: unknown) => caught)) as UnprocessableEntityException;
    const response = error.getResponse() as { faltantes: string[]; cobertura: { iso9001: boolean; propios: boolean } };
    expect(response.cobertura).toMatchObject({ iso9001: true, propios: false });
    expect(response.faltantes).toHaveLength(1);
    expect(response.faltantes[0]).toContain('requisitos propios');
    expect((await query.find(soloIso.id, gestor.organizacionId, { role: 'gestor', userId: gestor.sub })).estado).toBe('borrador');

    const vacia = await service.create(gestor, plantillaBody('Vacía'));
    const emptyError = (await service.publish(vacia.id, gestor).catch((caught: unknown) => caught)) as UnprocessableEntityException;
    expect((emptyError.getResponse() as { faltantes: string[] }).faltantes).toHaveLength(2);
  });

  it('publica cuando cubre ISO 9001 y los requisitos propios y la vuelve elegible', async () => {
    const published = await service.publish(plantillaId, gestor);

    expect(published.estado).toBe('publicada');
    expect(published.vigente).toBe(true);
    expect(published.publicada_en).not.toBeNull();
    expect(await query.isEligible(plantillaId, gestor.organizacionId)).toBe(true);
    expect((await query.eligible(gestor.organizacionId)).map((row) => row.id)).toContain(plantillaId);
    const versions = await database.orm.select().from(informacionDocumentada).where(eq(informacionDocumentada.entidadId, plantillaId));
    expect(versions.length).toBeGreaterThanOrEqual(4);
  });

  it('una plantilla publicada ya no se edita ni se publica otra vez', async () => {
    await expect(service.update(plantillaId, gestor, plantillaBody('Otro nombre'))).rejects.toBeInstanceOf(ConflictException);
    await expect(service.addQuestion(plantillaId, gestor, preguntaBody('¿Otra?', '8.1', 'norma'))).rejects.toBeInstanceOf(ConflictException);
    await expect(service.publish(plantillaId, gestor)).rejects.toBeInstanceOf(ConflictException);
  });

  describe('propuestas del líder', () => {
    let proposalId: string;

    it('el líder propone una pregunta sobre una plantilla vigente y se notifica al gestor', async () => {
      const proposal = await service.propose(plantillaId, lider, 'lider', preguntaBody('¿Se evalúan los proveedores?', '8.4', 'norma'));
      proposalId = proposal.id;

      expect(proposal.estado).toBe('pendiente');
      const notices = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, gestor.sub));
      expect(notices.some((notice) => notice.tipo === 'plantilla_propuesta')).toBe(true);
    });

    it('el gestor ve las propuestas pendientes y el líder solo las suyas', async () => {
      const gestorView = await query.detail(plantillaId, gestor.organizacionId, { role: 'gestor', userId: gestor.sub });
      const liderView = await query.detail(plantillaId, gestor.organizacionId, { role: 'lider', userId: lider.sub });

      expect(gestorView.propuestas).toHaveLength(1);
      expect(liderView.propuestas).toHaveLength(1);
    });

    it('aceptar sin una versión en borrador pide crear una nueva versión', async () => {
      await expect(service.acceptProposal(plantillaId, proposalId, gestor)).rejects.toBeInstanceOf(ConflictException);
    });

    it('al aceptar, la pregunta entra al borrador de la nueva versión y se avisa al líder', async () => {
      const draft = await service.newVersion(plantillaId, gestor);
      expect(draft.version).toBe(2);
      expect(draft.estado).toBe('borrador');
      expect(draft.preguntas).toHaveLength(2);
      await expect(service.newVersion(plantillaId, gestor)).rejects.toBeInstanceOf(ConflictException);

      const updated = await service.acceptProposal(plantillaId, proposalId, gestor);

      expect(updated.id).toBe(draft.id);
      expect(updated.preguntas).toHaveLength(3);
      expect(updated.preguntas[2].texto).toBe('¿Se evalúan los proveedores?');
      const [stored] = await database.orm.select().from(propuestaPregunta).where(eq(propuestaPregunta.id, proposalId));
      expect(stored.estado).toBe('aceptada');
      expect(stored.resueltaPorId).toBe(gestor.sub);
      const notices = await database.orm.select().from(notificacion).where(eq(notificacion.usuarioId, lider.sub));
      expect(notices.some((notice) => notice.tipo === 'plantilla_propuesta_aceptada')).toBe(true);
      await expect(service.acceptProposal(plantillaId, proposalId, gestor)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechazar deja la propuesta resuelta sin agregar la pregunta', async () => {
      const proposal = await service.propose(plantillaId, lider, 'lider', preguntaBody('¿Pregunta poco útil?', '4.1', 'norma'));

      await service.rejectProposal(plantillaId, proposal.id, gestor);

      const [stored] = await database.orm.select().from(propuestaPregunta).where(eq(propuestaPregunta.id, proposal.id));
      expect(stored.estado).toBe('rechazada');
    });
  });

  it('publicar la nueva versión archiva la anterior y solo la nueva queda elegible', async () => {
    const [draft] = await database.orm.select().from(plantillaChecklist).where(eq(plantillaChecklist.origenId, plantillaId));
    const nombre = draft.nombre;

    const published = await service.publish(draft.id, gestor);

    expect(published.version).toBe(2);
    const eligible = await query.eligible(gestor.organizacionId);
    expect(eligible.filter((row) => row.nombre === nombre).map((row) => row.id)).toEqual([draft.id]);
    const [old] = await database.orm.select().from(plantillaChecklist).where(eq(plantillaChecklist.id, plantillaId));
    expect(old.estado).toBe('archivada');
    expect(old.vigente).toBe(false);
    expect(await query.isEligible(plantillaId, gestor.organizacionId)).toBe(false);
  });

  it('el líder solo ve plantillas vigentes y no puede proponer sobre borradores', async () => {
    const draft = await service.create(gestor, plantillaBody('Borrador oculto'));

    const listed = await query.list(gestor.organizacionId, { role: 'lider', userId: lider.sub });

    expect(listed.every((entry) => entry.row.estado === 'publicada' && entry.row.vigente)).toBe(true);
    await expect(query.find(draft.id, gestor.organizacionId, { role: 'lider', userId: lider.sub })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.propose(draft.id, lider, 'lider', preguntaBody('¿Pregunta?', '9.2', 'norma'))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('otra organización no ve ni modifica las plantillas', async () => {
    const viewer = { role: 'gestor' as const, userId: otroGestor.sub };

    await expect(query.find(plantillaId, otroGestor.organizacionId, viewer)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(plantillaId, otroGestor, plantillaBody('Robo'))).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.publish(plantillaId, otroGestor)).rejects.toBeInstanceOf(NotFoundException);
    expect(await query.list(otroGestor.organizacionId, viewer)).toEqual([]);
    expect(await query.eligible(otroGestor.organizacionId)).toEqual([]);
  });

  describe('datos de pantalla y documento', () => {
    let provider: PlantillaScreenDataProvider;

    beforeAll(() => {
      provider = new PlantillaScreenDataProvider(query);
    });

    it('plantilla.editar entrega preguntas, propuestas y la entidad con su estado', async () => {
      const [draft] = await database.orm.select().from(plantillaChecklist).where(eq(plantillaChecklist.nombre, 'Borrador oculto'));

      const result = await provider.load({ screenId: 'plantilla.editar', user: gestor, role: 'gestor', entityId: draft.id });

      expect(result.entity).toEqual({ type: 'plantilla_checklist', id: draft.id, version: 1, estado: 'borrador' });
      const data = result.data as { plantilla: { nombre: string; preguntas: unknown[] }; pregunta: Record<string, string> };
      expect(data.plantilla.nombre).toBe('Borrador oculto');
      expect(data.pregunta).toEqual({ texto: '', clausula: '', criterio: '' });
    });

    it('plantilla.editar sin entidad: el gestor parte de una plantilla nueva y el líder de la vigente', async () => {
      const gestorResult = await provider.load({ screenId: 'plantilla.editar', user: gestor, role: 'gestor' });
      const liderResult = await provider.load({ screenId: 'plantilla.editar', user: lider, role: 'lider' });

      expect(gestorResult.entity).toBeUndefined();
      expect(liderResult.entity).toMatchObject({ estado: 'publicada' });
    });

    it('plantilla.publicar entrega la cobertura y lo que falta', async () => {
      const [vacia] = await database.orm.select().from(plantillaChecklist).where(eq(plantillaChecklist.nombre, 'Vacía'));
      const result = await provider.load({ screenId: 'plantilla.publicar', user: gestor, role: 'gestor', entityId: vacia.id });

      const data = result.data as { plantilla: { cobertura: { iso9001: boolean; propios: boolean; faltantes: string } } };
      expect(result.entity).toMatchObject({ estado: 'borrador' });
      expect(data.plantilla.cobertura.iso9001).toBe(false);
      expect(data.plantilla.cobertura.faltantes).toContain('ISO 9001');
    });

    it('plantilla.lista resume cada plantilla con su estado y cobertura', async () => {
      const result = await provider.load({ screenId: 'plantilla.lista', user: gestor, role: 'gestor' });

      const items = (result.data as { plantillas: { title: string; status: string }[] }).plantillas;
      expect(items.some((item) => item.title === 'Checklist 9.2 · v2' && item.status === 'Publicada (vigente)')).toBe(true);
      expect(result.offline?.enabled).toBe(true);
    });

    it('genera la lista de verificación imprimible con casillas, comentario y firmas', async () => {
      const documents = new PlantillaDocumentService(database.db, query);

      const file = await documents.checklistFormat(plantillaId, gestor.organizacionId, { role: 'gestor', userId: gestor.sub });
      const text = await DocxInspector.text(file.buffer);

      expect(text).toContain('Lista de verificación');
      expect(text).toContain('¿La política de la calidad es conocida?');
      expect(text).toContain('Cláusula: 5.2');
      expect(text).toContain('ISO 9001 (norma)');
      expect(text).toContain('☐ Conforme');
      expect(text).toContain('No aplica');
      expect(text).toContain('Comentario / evidencia');
      expect(text).toContain('Responsable del proceso');
      await expect(documents.checklistFormat(plantillaId, otroGestor.organizacionId, { role: 'gestor', userId: otroGestor.sub })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

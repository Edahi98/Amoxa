import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, ne, or } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { plantillaChecklist, pregunta, propuestaPregunta } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { PlantillaBody } from '@validators-plantillas/plantilla-body.schema.js';
import type { PreguntaBody } from '@validators-plantillas/pregunta-body.schema.js';
import { CriterioMapper } from '@plantillas-rules/criterio-mapper.js';
import { PlantillaStatus } from '@plantillas-rules/plantilla-status.js';
import { TemplateCoverage } from '@plantillas-rules/template-coverage.js';
import { PlantillaMapper } from '@plantillas-mappers-plantilla/plantilla-mapper.js';
import type { PlantillaRow, PlantillaView, PropuestaRow } from '@plantillas-mappers-plantilla/plantilla-view.js';
import { PlantillaQueryService, type PlantillaViewer } from '@plantillas-services-plantilla/plantilla-query.service.js';

@Injectable()
export class PlantillasService {
  public static readonly ENTITY_TYPE = 'plantilla_checklist';
  public static readonly PROPOSAL_TYPE = 'propuesta_pregunta';

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: PlantillaQueryService,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async create(user: TokenPayload, body: PlantillaBody): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(plantillaChecklist)
        .values({
          organizacionId: user.organizacionId,
          nombre: body.nombre,
          version: 1,
          vigente: false,
          estado: 'borrador',
          creadoPorId: user.sub,
        })
        .returning();
      return this.finish(tx, user, row);
    });
  }

  public async update(id: string, user: TokenPayload, body: PlantillaBody): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.editable(tx, id, user);
      const [row] = await tx
        .update(plantillaChecklist)
        .set({ nombre: body.nombre })
        .where(eq(plantillaChecklist.id, current.id))
        .returning();
      return this.finish(tx, user, row);
    });
  }

  public async addQuestion(id: string, user: TokenPayload, body: PreguntaBody): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.editable(tx, id, user);
      await this.insertQuestion(tx, current.id, body.texto, body.clausula, CriterioMapper.toDb(body.criterio), {
        tipoRespuesta: body.tipo_respuesta,
        evidenciaObligatoria: body.evidencia_obligatoria,
      });
      return this.finish(tx, user, current);
    });
  }

  public async reorder(id: string, user: TokenPayload, ids: readonly string[]): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.editable(tx, id, user);
      const existing = await this.query.questions(current.id, tx);
      const known = new Set(existing.map((question) => question.id));
      if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((item) => !known.has(item))) {
        throw new UnprocessableEntityException('El orden no coincide con las preguntas de la plantilla.');
      }
      for (const [index, questionId] of ids.entries()) {
        await tx
          .update(pregunta)
          .set({ orden: index + 1 })
          .where(and(eq(pregunta.id, questionId), eq(pregunta.plantillaId, current.id)));
      }
      return this.finish(tx, user, current);
    });
  }

  public async propose(id: string, user: TokenPayload, role: SessionRole, body: PreguntaBody): Promise<PropuestaRow> {
    return this.db.transaction(async (tx) => {
      const viewer: PlantillaViewer = { role, userId: user.sub };
      const plantilla = await this.query.find(id, user.organizacionId, viewer, tx);
      if (plantilla.estado === 'archivada') {
        throw new ConflictException('La plantilla está archivada y ya no recibe propuestas.');
      }
      const [proposal] = await tx
        .insert(propuestaPregunta)
        .values({
          plantillaId: plantilla.id,
          propuestaPorId: user.sub,
          texto: body.texto,
          clausulaRef: body.clausula,
          tipoCriterio: CriterioMapper.toDb(body.criterio),
        })
        .returning();
      await this.versions.record(
        {
          entidadTipo: PlantillasService.PROPOSAL_TYPE,
          entidadId: proposal.id,
          creadoPorId: user.sub,
          contenido: { ...proposal, creadaEn: proposal.creadaEn.toISOString() },
        },
        tx,
      );
      await this.notifications.notifyRole(
        user.organizacionId,
        'gestor',
        {
          tipo: 'plantilla_propuesta',
          titulo: 'Nueva propuesta de pregunta',
          mensaje: `Se propuso una pregunta para la plantilla ${plantilla.nombre}. Revísela en el editor.`,
          entidadTipo: PlantillasService.ENTITY_TYPE,
          entidadId: plantilla.id,
        },
        tx,
      );
      return proposal;
    });
  }

  public async acceptProposal(id: string, proposalId: string, user: TokenPayload): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const plantilla = await this.query.find(id, user.organizacionId, { role: 'gestor', userId: user.sub }, tx);
      const proposal = await this.pendingProposal(tx, plantilla.id, proposalId);
      const draft = await this.targetDraft(tx, plantilla, user);
      await this.insertQuestion(tx, draft.id, proposal.texto, proposal.clausulaRef ?? '', proposal.tipoCriterio, {});
      await this.resolveProposal(tx, user, proposal, 'aceptada', plantilla.nombre);
      return this.finish(tx, user, draft);
    });
  }

  public async rejectProposal(id: string, proposalId: string, user: TokenPayload): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const plantilla = await this.query.find(id, user.organizacionId, { role: 'gestor', userId: user.sub }, tx);
      const proposal = await this.pendingProposal(tx, plantilla.id, proposalId);
      await this.resolveProposal(tx, user, proposal, 'rechazada', plantilla.nombre);
      const detail = await this.query.detailOf(plantilla, { role: 'gestor', userId: user.sub }, tx);
      return PlantillaMapper.toView(detail);
    });
  }

  public async publish(id: string, user: TokenPayload): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.query.find(id, user.organizacionId, { role: 'gestor', userId: user.sub }, tx);
      if (!PlantillaStatus.canPublish(current.estado)) {
        throw new ConflictException('Solo se puede publicar una plantilla en borrador.');
      }
      const questions = await this.query.questions(current.id, tx);
      const coverage = TemplateCoverage.evaluate(questions);
      if (!coverage.completa) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: `La plantilla no se puede publicar porque no cubre ISO 9001 y los requisitos propios. ${coverage.faltantes}`,
          faltantes: coverage.detalle,
          cobertura: coverage,
        });
      }

      const root = current.origenId ?? current.id;
      const superseded = await tx
        .update(plantillaChecklist)
        .set({ vigente: false, estado: 'archivada' })
        .where(
          and(
            eq(plantillaChecklist.organizacionId, user.organizacionId),
            eq(plantillaChecklist.estado, 'publicada'),
            ne(plantillaChecklist.id, current.id),
            or(eq(plantillaChecklist.id, root), eq(plantillaChecklist.origenId, root)),
          ),
        )
        .returning();
      for (const old of superseded) {
        await this.finish(tx, user, old);
      }

      const [row] = await tx
        .update(plantillaChecklist)
        .set({ estado: 'publicada', vigente: true, publicadaEn: new Date(), publicadaPorId: user.sub })
        .where(eq(plantillaChecklist.id, current.id))
        .returning();
      return this.finish(tx, user, row);
    });
  }

  public async newVersion(id: string, user: TokenPayload): Promise<PlantillaView> {
    return this.db.transaction(async (tx) => {
      const current = await this.query.find(id, user.organizacionId, { role: 'gestor', userId: user.sub }, tx);
      if (current.estado !== 'publicada') {
        throw new ConflictException('Solo se puede crear una nueva versión a partir de una plantilla publicada.');
      }
      const root = current.origenId ?? current.id;
      const lineage = await tx
        .select()
        .from(plantillaChecklist)
        .where(
          and(
            eq(plantillaChecklist.organizacionId, user.organizacionId),
            or(eq(plantillaChecklist.id, root), eq(plantillaChecklist.origenId, root)),
          ),
        );
      if (lineage.some((entry) => entry.estado === 'borrador')) {
        throw new ConflictException('Ya existe una versión en borrador de esta plantilla.');
      }
      const [row] = await tx
        .insert(plantillaChecklist)
        .values({
          organizacionId: user.organizacionId,
          nombre: current.nombre,
          version: Math.max(...lineage.map((entry) => entry.version)) + 1,
          vigente: false,
          estado: 'borrador',
          origenId: root,
          creadoPorId: user.sub,
        })
        .returning();
      for (const question of await this.query.questions(current.id, tx)) {
        await tx.insert(pregunta).values({
          plantillaId: row.id,
          orden: question.orden,
          texto: question.texto,
          clausulaRef: question.clausulaRef,
          tipoCriterio: question.tipoCriterio,
          tipoRespuesta: question.tipoRespuesta,
          evidenciaObligatoria: question.evidenciaObligatoria,
        });
      }
      return this.finish(tx, user, row);
    });
  }

  private async editable(executor: DbExecutor, id: string, user: TokenPayload): Promise<PlantillaRow> {
    const row = await this.query.find(id, user.organizacionId, { role: 'gestor', userId: user.sub }, executor);
    if (!PlantillaStatus.canEdit(row.estado)) {
      throw new ConflictException('Una plantilla publicada no se edita. Cree una nueva versión para modificarla.');
    }
    return row;
  }

  private async targetDraft(executor: DbExecutor, plantilla: PlantillaRow, user: TokenPayload): Promise<PlantillaRow> {
    if (PlantillaStatus.canEdit(plantilla.estado)) {
      return plantilla;
    }
    const root = plantilla.origenId ?? plantilla.id;
    const [draft] = await executor
      .select()
      .from(plantillaChecklist)
      .where(
        and(
          eq(plantillaChecklist.organizacionId, user.organizacionId),
          eq(plantillaChecklist.estado, 'borrador'),
          or(eq(plantillaChecklist.id, root), eq(plantillaChecklist.origenId, root)),
        ),
      )
      .limit(1);
    if (draft === undefined) {
      throw new ConflictException('La plantilla está publicada. Cree una nueva versión en borrador para incorporar la propuesta.');
    }
    return draft;
  }

  private async pendingProposal(executor: DbExecutor, plantillaId: string, proposalId: string): Promise<PropuestaRow> {
    const [proposal] = await executor
      .select()
      .from(propuestaPregunta)
      .where(and(eq(propuestaPregunta.id, proposalId), eq(propuestaPregunta.plantillaId, plantillaId)))
      .limit(1);
    if (proposal === undefined) {
      throw new NotFoundException('Propuesta no encontrada');
    }
    if (proposal.estado !== 'pendiente') {
      throw new ConflictException('La propuesta ya fue resuelta.');
    }
    return proposal;
  }

  private async resolveProposal(
    executor: DbExecutor,
    user: TokenPayload,
    proposal: PropuestaRow,
    estado: 'aceptada' | 'rechazada',
    plantillaNombre: string,
  ): Promise<void> {
    const [updated] = await executor
      .update(propuestaPregunta)
      .set({ estado, resueltaPorId: user.sub, resueltaEn: new Date() })
      .where(eq(propuestaPregunta.id, proposal.id))
      .returning();
    await this.versions.record(
      {
        entidadTipo: PlantillasService.PROPOSAL_TYPE,
        entidadId: proposal.id,
        creadoPorId: user.sub,
        contenido: {
          ...updated,
          creadaEn: updated.creadaEn.toISOString(),
          resueltaEn: updated.resueltaEn?.toISOString() ?? null,
        },
      },
      executor,
    );
    await this.notifications.notifyUsers(
      [proposal.propuestaPorId],
      {
        tipo: estado === 'aceptada' ? 'plantilla_propuesta_aceptada' : 'plantilla_propuesta_rechazada',
        titulo: estado === 'aceptada' ? 'Propuesta aceptada' : 'Propuesta rechazada',
        mensaje: `El gestor ${estado === 'aceptada' ? 'aceptó' : 'rechazó'} su propuesta para la plantilla ${plantillaNombre}.`,
        entidadTipo: PlantillasService.ENTITY_TYPE,
        entidadId: proposal.plantillaId,
      },
      executor,
    );
  }

  private async insertQuestion(
    executor: DbExecutor,
    plantillaId: string,
    texto: string,
    clausula: string,
    tipoCriterio: ReturnType<typeof CriterioMapper.toDb>,
    extra: { tipoRespuesta?: 'si_no' | 'escala' | 'texto' | 'multiple'; evidenciaObligatoria?: boolean },
  ): Promise<void> {
    const existing = await this.query.questions(plantillaId, executor);
    const orden = existing.reduce((max, question) => Math.max(max, question.orden), 0) + 1;
    await executor.insert(pregunta).values({
      plantillaId,
      orden,
      texto,
      clausulaRef: clausula === '' ? null : clausula,
      tipoCriterio,
      tipoRespuesta: extra.tipoRespuesta ?? 'si_no',
      evidenciaObligatoria: extra.evidenciaObligatoria ?? false,
    });
  }

  private async finish(executor: DbExecutor, user: TokenPayload, row: PlantillaRow): Promise<PlantillaView> {
    const detail = await this.query.detailOf(row, { role: 'gestor', userId: user.sub }, executor);
    await this.versions.record(
      {
        entidadTipo: PlantillasService.ENTITY_TYPE,
        entidadId: row.id,
        creadoPorId: user.sub,
        contenido: PlantillaMapper.snapshot(detail),
      },
      executor,
    );
    return PlantillaMapper.toView(detail);
  }
}

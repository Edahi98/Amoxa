import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { plantillaChecklist, pregunta, propuestaPregunta, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import { PlantillaStatus } from '@plantillas-rules/plantilla-status.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type {
  PlantillaDetail,
  PlantillaRow,
  PreguntaRow,
  PropuestaDetail,
} from '@plantillas-mappers-plantilla/plantilla-view.js';

export interface PlantillaViewer {
  role: SessionRole;
  userId: string;
}

@Injectable()
export class PlantillaQueryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  public async list(
    organizacionId: string,
    viewer: PlantillaViewer,
    executor: DbExecutor = this.db,
  ): Promise<{ row: PlantillaRow; preguntas: PreguntaRow[] }[]> {
    const rows = await executor
      .select()
      .from(plantillaChecklist)
      .where(and(eq(plantillaChecklist.organizacionId, organizacionId), ne(plantillaChecklist.estado, 'archivada')))
      .orderBy(asc(plantillaChecklist.nombre), desc(plantillaChecklist.version));
    const visible = rows.filter((row) => this.canSee(row, viewer));
    if (visible.length === 0) {
      return [];
    }
    const questions = await executor
      .select()
      .from(pregunta)
      .where(inArray(pregunta.plantillaId, visible.map((row) => row.id)))
      .orderBy(asc(pregunta.orden));
    return visible.map((row) => ({ row, preguntas: questions.filter((question) => question.plantillaId === row.id) }));
  }

  public async find(
    id: string,
    organizacionId: string,
    viewer: PlantillaViewer,
    executor: DbExecutor = this.db,
  ): Promise<PlantillaRow> {
    const [row] = await executor
      .select()
      .from(plantillaChecklist)
      .where(and(eq(plantillaChecklist.id, id), eq(plantillaChecklist.organizacionId, organizacionId)))
      .limit(1);
    if (row === undefined || !this.canSee(row, viewer)) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return row;
  }

  public async latestDraft(organizacionId: string, executor: DbExecutor = this.db): Promise<PlantillaRow | undefined> {
    const [row] = await executor
      .select()
      .from(plantillaChecklist)
      .where(and(eq(plantillaChecklist.organizacionId, organizacionId), eq(plantillaChecklist.estado, 'borrador')))
      .orderBy(desc(plantillaChecklist.version))
      .limit(1);
    return row;
  }

  public async eligible(organizacionId: string, executor: DbExecutor = this.db): Promise<PlantillaRow[]> {
    return executor
      .select()
      .from(plantillaChecklist)
      .where(
        and(
          eq(plantillaChecklist.organizacionId, organizacionId),
          eq(plantillaChecklist.estado, 'publicada'),
          eq(plantillaChecklist.vigente, true),
        ),
      )
      .orderBy(desc(plantillaChecklist.publicadaEn));
  }

  public async isEligible(id: string, organizacionId: string, executor: DbExecutor = this.db): Promise<boolean> {
    const [row] = await executor
      .select()
      .from(plantillaChecklist)
      .where(and(eq(plantillaChecklist.id, id), eq(plantillaChecklist.organizacionId, organizacionId)))
      .limit(1);
    return row !== undefined && PlantillaStatus.isEligible(row.estado, row.vigente);
  }

  public async questions(plantillaId: string, executor: DbExecutor = this.db): Promise<PreguntaRow[]> {
    return executor.select().from(pregunta).where(eq(pregunta.plantillaId, plantillaId)).orderBy(asc(pregunta.orden));
  }

  public async detailOf(row: PlantillaRow, viewer: PlantillaViewer, executor: DbExecutor = this.db): Promise<PlantillaDetail> {
    return {
      row,
      preguntas: await this.questions(row.id, executor),
      propuestas: await this.pendingProposals(row.id, viewer, executor),
    };
  }

  public async detail(
    id: string,
    organizacionId: string,
    viewer: PlantillaViewer,
    executor: DbExecutor = this.db,
  ): Promise<PlantillaDetail> {
    return this.detailOf(await this.find(id, organizacionId, viewer, executor), viewer, executor);
  }

  public async pendingProposals(
    plantillaId: string,
    viewer: PlantillaViewer,
    executor: DbExecutor = this.db,
  ): Promise<PropuestaDetail[]> {
    const rows = await executor
      .select({ row: propuestaPregunta, nombre: usuario.nombre })
      .from(propuestaPregunta)
      .innerJoin(usuario, eq(usuario.id, propuestaPregunta.propuestaPorId))
      .where(and(eq(propuestaPregunta.plantillaId, plantillaId), eq(propuestaPregunta.estado, 'pendiente')))
      .orderBy(asc(propuestaPregunta.creadaEn));
    return rows
      .filter((entry) => RoleAccess.actsAs(viewer.role, 'gestor') || entry.row.propuestaPorId === viewer.userId)
      .map((entry) => ({ row: entry.row, propuestaPor: entry.nombre }));
  }

  private canSee(row: PlantillaRow, viewer: PlantillaViewer): boolean {
    return viewer.role === 'lider' ? PlantillaStatus.isEligible(row.estado, row.vigente) : true;
  }
}

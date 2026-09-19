import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacion } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { ReviewMinutesData } from '@docx-seguimiento/review-minutes.docx.js';
import { ProgramLoader } from '@seguimiento-revision-program/program-loader.js';
import { RevisionDireccionService } from '@seguimiento-revision/revision-direccion.service.js';

@Injectable()
export class ReviewMinutesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly programs: ProgramLoader,
    private readonly revision: RevisionDireccionService,
  ) {}

  public async data(user: TokenPayload, programaId: string): Promise<ReviewMinutesData> {
    const programa = await this.programs.find(user.organizacionId, programaId);
    const [org] = await this.db.select({ nombre: organizacion.nombre }).from(organizacion).where(eq(organizacion.id, user.organizacionId));
    const view = await this.revision.build(user.organizacionId, programa);
    return {
      organizacion: org?.nombre ?? 'Organización',
      generadoEn: new Date(),
      programa: view.programa,
      resumen: view.revision.resumen,
      indicadores: view.indicadores,
      presentaciones: view.presentaciones,
      decisiones: view.decisiones,
      lecciones: view.lecciones,
    };
  }
}

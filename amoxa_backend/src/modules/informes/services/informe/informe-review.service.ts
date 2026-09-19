import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { informe, informeFirma } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { InformeLeaderGuard } from '@informes-rules-informe/informe-leader-guard.js';
import { InformeTransitions } from '@informes-rules-informe/informe-transitions.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';

export interface ConclusionesResult {
  id: string;
  estado: string;
  conclusiones: string;
}

export interface FirmaResult {
  id: string;
  estado: string;
  huella: string;
  firmadoEn: string;
  fechaEmision: string;
}

@Injectable()
export class InformeReviewService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly loader: InformeLoaderService,
    private readonly versions: RecordVersionService,
  ) {}

  async updateConclusions(informeId: string, user: TokenPayload, conclusiones: string): Promise<ConclusionesResult> {
    return this.db.transaction(async (tx) => {
      const detail = await this.loader.detail(informeId, user.organizacionId, tx);
      InformeLeaderGuard.assertLeader(detail.liderId, user.sub);
      InformeTransitions.assertCanEditConclusions(detail.estado);
      await this.saveConclusions(informeId, conclusiones, user, tx);
      return { id: informeId, estado: detail.estado, conclusiones };
    });
  }

  async sign(informeId: string, user: TokenPayload, firma: string, conclusiones?: string): Promise<FirmaResult> {
    return this.db.transaction(async (tx) => {
      let detail = await this.loader.detail(informeId, user.organizacionId, tx);
      InformeLeaderGuard.assertLeader(detail.liderId, user.sub);
      if (conclusiones !== undefined && detail.estado === 'borrador') {
        await this.saveConclusions(informeId, conclusiones, user, tx);
        detail = await this.loader.detail(informeId, user.organizacionId, tx);
      }
      InformeTransitions.assertCanSign(detail.estado, detail.conclusiones);

      const firmadoEn = new Date();
      const [signed] = await tx
        .insert(informeFirma)
        .values({ informeId, firmanteId: user.sub, firma, huella: detail.huellaActual, firmadoEn })
        .onConflictDoNothing({ target: informeFirma.informeId })
        .returning({ id: informeFirma.informeId });
      if (signed === undefined) {
        throw new UnprocessableEntityException('El informe ya fue firmado.');
      }

      const fechaEmision = firmadoEn.toISOString().slice(0, 10);
      await tx.update(informe).set({ fechaEmision }).where(eq(informe.id, informeId));
      await this.versions.record(
        {
          entidadTipo: 'informe',
          entidadId: informeId,
          creadoPorId: user.sub,
          contenido: { estado: 'firmado', conclusiones: detail.conclusiones, huella: detail.huellaActual, fechaEmision },
        },
        tx,
      );
      return { id: informeId, estado: 'firmado', huella: detail.huellaActual, firmadoEn: firmadoEn.toISOString(), fechaEmision };
    });
  }

  private async saveConclusions(informeId: string, conclusiones: string, user: TokenPayload, executor: DbExecutor): Promise<void> {
    await executor.update(informe).set({ conclusiones }).where(eq(informe.id, informeId));
    await this.versions.record(
      { entidadTipo: 'informe', entidadId: informeId, creadoPorId: user.sub, contenido: { estado: 'borrador', conclusiones } },
      executor,
    );
  }

}

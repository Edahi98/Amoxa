import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, flujoInstancia } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import { WorkflowCatalog } from '@shared-workflow/workflow-catalog.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AuditVisibility } from '@registros-consulta/audit-visibility.js';
import { FlujoProgressService, type FlujoInstanciaRow, type FlujoProgress } from '@flujos-services-flujo/flujo-progress.service.js';

export interface FlujoInstanceView {
  instance: FlujoInstanciaRow;
  progress: FlujoProgress;
}

@Injectable()
export class FlujoInstanceService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly progress: FlujoProgressService,
  ) {}

  public async start(flujoId: string, auditoriaId: string, user: TokenPayload, role: SessionRole): Promise<{ id: string }> {
    if (WorkflowCatalog.find(flujoId) === undefined) {
      throw new NotFoundException('Flujo no encontrado');
    }
    const [visible] = await this.db
      .select({ id: auditoria.id })
      .from(auditoria)
      .where(and(eq(auditoria.id, auditoriaId), inArray(auditoria.id, AuditVisibility.auditIds(this.db, user, role))))
      .limit(1);
    if (!visible) {
      throw new NotFoundException('Auditoría no encontrada');
    }

    const [created] = await this.db
      .insert(flujoInstancia)
      .values({ organizacionId: user.organizacionId, flujoId, auditoriaId, iniciadoPorId: user.sub })
      .onConflictDoNothing()
      .returning({ id: flujoInstancia.id });
    if (!created) {
      throw new ConflictException('Ya hay un flujo en curso para esa auditoría');
    }
    return created;
  }

  public async list(user: TokenPayload, role: SessionRole): Promise<FlujoInstanceView[]> {
    const rows = await this.db
      .select()
      .from(flujoInstancia)
      .where(
        and(
          eq(flujoInstancia.organizacionId, user.organizacionId),
          inArray(flujoInstancia.auditoriaId, AuditVisibility.auditIds(this.db, user, role)),
        ),
      )
      .orderBy(desc(flujoInstancia.iniciadoEn));
    return Promise.all(rows.map(async (instance) => ({ instance, progress: await this.progress.compute(instance) })));
  }

  public async get(id: string, user: TokenPayload, role: SessionRole): Promise<FlujoInstanceView> {
    const [instance] = await this.db
      .select()
      .from(flujoInstancia)
      .where(
        and(
          eq(flujoInstancia.id, id),
          eq(flujoInstancia.organizacionId, user.organizacionId),
          inArray(flujoInstancia.auditoriaId, AuditVisibility.auditIds(this.db, user, role)),
        ),
      )
      .limit(1);
    if (!instance) {
      throw new NotFoundException('Flujo no encontrado');
    }
    return { instance, progress: await this.progress.compute(instance) };
  }

  public async conclude(id: string, user: TokenPayload, role: SessionRole): Promise<{ id: string }> {
    const { instance, progress } = await this.get(id, user, role);
    if (instance.completadoEn !== null) {
      throw new ConflictException('El flujo ya está concluido');
    }
    if (!progress.canConclude) {
      throw new UnprocessableEntityException('Todavía faltan pasos por completar para concluir el flujo');
    }
    await this.db.update(flujoInstancia).set({ completadoEn: new Date() }).where(eq(flujoInstancia.id, instance.id));
    return { id: instance.id };
  }
}

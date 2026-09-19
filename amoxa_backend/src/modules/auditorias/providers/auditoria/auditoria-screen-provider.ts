import { Injectable, NotFoundException } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import type { RawEntity, RawOffline } from '@sdui-builder/raw-json.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';

@Injectable()
export abstract class AuditoriaScreenProvider extends ScreenDataProvider {
  private static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  protected static readonly OFFLINE: RawOffline = { enabled: true, cache_ttl_seconds: 300, conflict_policy: 'server_wins' };

  constructor(
    protected readonly access: AuditoriaAccess,
    protected readonly versions: RecordVersionService,
  ) {
    super();
  }

  protected async detail(request: ScreenDataRequest): Promise<AuditoriaDetalle | undefined> {
    if (request.entityId === undefined) {
      return undefined;
    }
    if (!AuditoriaScreenProvider.UUID.test(request.entityId)) {
      throw new NotFoundException('Auditoría no encontrada');
    }
    return this.access.visible(request.entityId, request.user, request.role);
  }

  protected async entity(detalle: AuditoriaDetalle): Promise<RawEntity> {
    const history = await this.versions.history(AuditoriaRecorder.ENTITY, detalle.id);
    return { type: 'auditoria', id: detalle.id, version: history[0]?.version ?? 1, estado: detalle.estado };
  }

  protected async build(request: ScreenDataRequest, data: (detalle: AuditoriaDetalle) => Promise<Record<string, unknown>> | Record<string, unknown>): Promise<ScreenData> {
    const detalle = await this.detail(request);
    if (detalle === undefined) {
      return {};
    }
    return { data: await data(detalle), entity: await this.entity(detalle), offline: AuditoriaScreenProvider.OFFLINE };
  }
}

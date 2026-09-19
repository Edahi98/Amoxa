import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import type { RawEntity } from '@sdui-builder/raw-json.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditorAccess } from '@auditores-rules-auditor/auditor-access.js';
import { AuditorMapper } from '@auditores-mappers-auditor/auditor-mapper.js';
import type { AuditorRecord } from '@auditores-mappers-auditor/auditor-view.js';
import { AuditorQueryService } from '@auditores-services-auditor/auditor-query.service.js';
import { AuditoresService } from '@auditores-services/auditores.service.js';

@Injectable()
@ScreenDataDecorator.of('auditor.lista', 'auditor.ficha', 'auditor.evaluacion')
export class AuditorScreenDataProvider extends ScreenDataProvider {
  constructor(
    private readonly query: AuditorQueryService,
    private readonly versions: RecordVersionService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (request.screenId === 'auditor.lista') {
      return this.list(request);
    }
    const id = request.role === 'auditor' ? request.user.sub : request.entityId;
    if (id === undefined) {
      return this.empty(request.screenId);
    }
    AuditorAccess.assertCanRead(request.role, request.user.sub, id);
    const record = await this.query.find(id, request.user.organizacionId);
    return request.screenId === 'auditor.ficha' ? this.ficha(record) : this.evaluation(record);
  }

  private async list(request: ScreenDataRequest): Promise<ScreenData> {
    const records = await this.query.list(request.user.organizacionId);
    return {
      data: { auditores: records.map((record) => AuditorMapper.toSummary(record)) },
      offline: { enabled: true, cache_ttl_seconds: 3600, conflict_policy: 'server_wins' },
    };
  }

  private async ficha(record: AuditorRecord): Promise<ScreenData> {
    const evaluaciones = await this.query.evaluations(record.id);
    const view = AuditorMapper.toView(record, evaluaciones);
    return {
      data: {
        auditor: {
          id: view.id,
          nombre: view.nombre,
          formacion: view.formacion ?? '',
          experiencia: view.experiencia ?? '',
          especialidades: view.especialidades,
          apto: view.apto,
          vigencia_hasta: view.vigencia_hasta ?? '',
        },
        evaluaciones: view.evaluaciones,
      },
      entity: await this.entityOf(record),
      offline: { enabled: false },
    };
  }

  private async evaluation(record: AuditorRecord): Promise<ScreenData> {
    const evaluaciones = await this.query.evaluations(record.id);
    const view = AuditorMapper.toView(record, evaluaciones);
    return {
      data: {
        auditor: { id: view.id, nombre: view.nombre, apto: view.apto, vigencia_hasta: view.vigencia_hasta ?? '' },
        evaluacion: { metodos: [], resultado: '', observaciones: '', ultima_id: evaluaciones[0]?.id ?? '' },
      },
      entity: await this.entityOf(record),
      offline: { enabled: false },
    };
  }

  private empty(screenId: string): ScreenData {
    return {
      data:
        screenId === 'auditor.ficha'
          ? { auditor: {} }
          : { auditor: {}, evaluacion: { metodos: [], resultado: '', observaciones: '', ultima_id: '' } },
      offline: { enabled: false },
    };
  }

  private async entityOf(record: AuditorRecord): Promise<RawEntity> {
    const history = await this.versions.history(AuditoresService.ENTITY_TYPE, record.id);
    return {
      type: AuditoresService.ENTITY_TYPE,
      id: record.id,
      version: history[0]?.version ?? 1,
      estado: record.estado ?? 'formacion',
    };
  }
}

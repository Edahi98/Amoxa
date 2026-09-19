import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { DistributionRules } from '@informes-rules/distribution-rules.js';
import { InformeContentBuilder } from '@informes-rules-informe/informe-content-builder.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';
import { InformeDistributionService } from '@informes-services-informe/informe-distribution.service.js';
import { InformeEntityResolverService } from '@informes-services-informe/informe-entity-resolver.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';

@Injectable()
@ScreenDataDecorator.of('informe.vista_previa', 'informe.distribuir', 'informe.ver')
export class InformeScreenProvider extends ScreenDataProvider {
  private static readonly ROLE_LABELS: Record<string, string> = {
    admin: 'Alta dirección',
    gestor_programa: 'Gestor',
    lider_auditor: 'Líder',
    auditor: 'Auditor',
    auditado: 'Dueño de proceso',
  };

  constructor(
    private readonly resolver: InformeEntityResolverService,
    private readonly reader: InformeReadService,
    private readonly distribution: InformeDistributionService,
    private readonly versions: RecordVersionService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const preferred = request.screenId === 'informe.vista_previa' ? ['borrador'] : request.screenId === 'informe.distribuir' ? ['firmado'] : ['distribuido'];
    const informeId = await this.resolver.resolve(request.entityId, request.user, request.role, preferred);
    if (informeId === undefined) {
      return { data: { informe: {}, distribucion: { destinatarios: [], incluye_direccion: false } } };
    }

    const detail = await this.reader.get(informeId, request.user, request.role);
    const history = await this.versions.history('informe', informeId);
    const entity = { type: 'informe', id: informeId, version: history[0]?.version ?? 1, estado: detail.estado };
    const informe = {
      id: detail.id,
      auditoria_id: detail.auditoriaId,
      titulo: detail.titulo,
      resumen: InformeContentBuilder.summary(detail.procesos, detail.hallazgos),
      hallazgos: InformeContentBuilder.findingsText(detail.hallazgos),
      conclusiones: detail.conclusiones ?? '',
      grado_conformidad: detail.gradoConformidad ?? '',
      firma: '',
      firmado_por: detail.firma?.firmanteNombre ?? '',
      huella: detail.firma?.huella ?? '',
    };

    if (request.screenId === 'informe.distribuir') {
      return { entity, data: { informe, ...(await this.distributionData(detail)) } };
    }
    if (request.screenId === 'informe.ver') {
      const own = detail.distribucion.find((item) => item.usuarioId === request.user.sub);
      return { entity, data: { informe, distribucion: { leido_en: own?.leidoEn ?? '' } } };
    }
    return { entity, data: { informe } };
  }

  private async distributionData(detail: InformeDetalle): Promise<Record<string, unknown>> {
    const candidates = await this.distribution.candidates(detail);
    const selected =
      detail.distribucion.length > 0
        ? detail.distribucion.map((item) => item.usuarioId)
        : candidates.filter((candidate) => candidate.rol === 'admin' || candidate.rol === 'auditado').map((candidate) => candidate.id);
    const selectedCandidates = candidates.filter((candidate) => selected.includes(candidate.id));
    return {
      distribucion: {
        destinatarios: selected,
        incluye_direccion: DistributionRules.includesDirection(selectedCandidates),
      },
      opciones: {
        destinatarios: candidates.map((candidate) => ({
          value: candidate.id,
          label: candidate.nombre,
          description: InformeScreenProvider.ROLE_LABELS[candidate.rol] ?? candidate.rol,
        })),
      },
    };
  }
}

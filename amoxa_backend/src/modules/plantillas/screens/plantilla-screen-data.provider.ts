import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import type { RawEntity } from '@sdui-builder/raw-json.types.js';
import { PlantillaMapper } from '@plantillas-mappers-plantilla/plantilla-mapper.js';
import type { PlantillaRow, PlantillaView } from '@plantillas-mappers-plantilla/plantilla-view.js';
import { PlantillaQueryService, type PlantillaViewer } from '@plantillas-services-plantilla/plantilla-query.service.js';

@Injectable()
@ScreenDataDecorator.of('plantilla.lista', 'plantilla.editar', 'plantilla.publicar')
export class PlantillaScreenDataProvider extends ScreenDataProvider {
  public static readonly ENTITY_TYPE = 'plantilla_checklist';

  constructor(private readonly query: PlantillaQueryService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const viewer: PlantillaViewer = { role: request.role, userId: request.user.sub };
    if (request.screenId === 'plantilla.lista') {
      return this.list(request, viewer);
    }
    if (request.screenId === 'plantilla.editar') {
      return this.edit(request, viewer);
    }
    return this.publish(request, viewer);
  }

  private async list(request: ScreenDataRequest, viewer: PlantillaViewer): Promise<ScreenData> {
    const entries = await this.query.list(request.user.organizacionId, viewer);
    return {
      data: {
        plantillas: entries.map((entry) => {
          const summary = PlantillaMapper.toSummary(entry.row, entry.preguntas);
          return {
            id: summary.id,
            title: `${summary.nombre} · v${summary.version}`,
            description: `${summary.total_preguntas} preguntas · ISO 9001: ${summary.cobertura.iso9001 ? 'cubierta' : 'falta'} · Requisitos propios: ${summary.cobertura.propios ? 'cubiertos' : 'faltan'}`,
            status: summary.estado_etiqueta,
          };
        }),
      },
      offline: { enabled: true, cache_ttl_seconds: 3600, conflict_policy: 'server_wins' },
    };
  }

  private async edit(request: ScreenDataRequest, viewer: PlantillaViewer): Promise<ScreenData> {
    const organizacionId = request.user.organizacionId;
    let row: PlantillaRow | undefined;
    if (request.entityId !== undefined) {
      row = await this.query.find(request.entityId, organizacionId, viewer);
    } else if (viewer.role === 'lider') {
      row = (await this.query.eligible(organizacionId))[0];
    }
    const blank = { texto: '', clausula: '', criterio: '' };
    const importar = { archivo: null, clausula: '', criterio: '' };
    const orden = { preguntas: [] as unknown[] };
    if (row === undefined) {
      return {
        data: { plantilla: { nombre: '', preguntas: [] }, pregunta: blank, importar, orden, propuestas: [] },
        offline: { enabled: false },
      };
    }
    const view = PlantillaMapper.toView(await this.query.detailOf(row, viewer));
    return {
      data: { plantilla: view, pregunta: blank, importar, orden: { preguntas: view.preguntas }, propuestas: view.propuestas },
      entity: this.entityOf(row),
      offline: { enabled: false },
    };
  }

  private async publish(request: ScreenDataRequest, viewer: PlantillaViewer): Promise<ScreenData> {
    const organizacionId = request.user.organizacionId;
    const row =
      request.entityId === undefined
        ? await this.query.latestDraft(organizacionId)
        : await this.query.find(request.entityId, organizacionId, viewer);
    if (row === undefined) {
      return { data: { plantilla: { nombre: '', cobertura: { iso9001: false, propios: false, faltantes: '' } } }, offline: { enabled: false } };
    }
    const view: PlantillaView = PlantillaMapper.toView(await this.query.detailOf(row, viewer));
    return {
      data: { plantilla: { id: view.id, nombre: view.nombre, version: view.version, cobertura: view.cobertura } },
      entity: this.entityOf(row),
      offline: { enabled: false },
    };
  }

  private entityOf(row: PlantillaRow): RawEntity {
    return { type: PlantillaScreenDataProvider.ENTITY_TYPE, id: row.id, version: row.version, estado: row.estado };
  }
}

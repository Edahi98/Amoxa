import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import type { RawEntity } from '@sdui-builder/raw-json.types.js';
import { FrequencySuggester } from '@programas-rules/frequency-suggester.js';
import { ProgramaCalendar } from '@programas-rules-programa/programa-calendar.js';
import { ProgramaStatus } from '@programas-rules-programa/programa-status.js';
import { ProgramaMapper } from '@programas-mappers-programa/programa-mapper.js';
import type { ProgramaDetail, ProgramaRow } from '@programas-mappers-programa/programa-view.js';
import { ProgramaQueryService } from '@programas-services-programa/programa-query.service.js';

@Injectable()
@ScreenDataDecorator.of('programa.lista', 'programa.editar', 'programa.aprobar')
export class ProgramaScreenDataProvider extends ScreenDataProvider {
  public static readonly ENTITY_TYPE = 'programa_auditoria';

  constructor(private readonly query: ProgramaQueryService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    if (request.screenId === 'programa.lista') {
      return this.list(request);
    }
    if (request.screenId === 'programa.editar') {
      return this.edit(request);
    }
    return this.approve(request);
  }

  private async list(request: ScreenDataRequest): Promise<ScreenData> {
    const organizacionId = request.user.organizacionId;
    const rows = await this.query.list(organizacionId, request.role);
    const current = rows.find((row) => row.estado === 'aprobado' || row.estado === 'en_ejecucion') ?? rows[0];
    const calendar =
      current === undefined
        ? []
        : ProgramaCalendar.events(
            { id: current.id, periodo: current.periodo, fechaInicio: current.fechaInicio, fechaFin: current.fechaFin },
            await this.query.audits(current.id),
          );
    return {
      data: {
        programas: rows.map((row) => this.listItem(row)),
        programa: { id: current?.id ?? '', calendario: calendar },
      },
      offline: { enabled: true, cache_ttl_seconds: 3600, conflict_policy: 'server_wins' },
    };
  }

  private async edit(request: ScreenDataRequest): Promise<ScreenData> {
    const organizacionId = request.user.organizacionId;
    const ranking = await this.query.ranking(organizacionId);
    const suggestion = {
      frecuencia: FrequencySuggester.suggest(ranking),
      procesos: ranking.map((entry) => ({ id: entry.id, nombre: entry.nombre, puntaje: entry.puntaje })),
    };
    const opciones = {
      procesos: ranking.map((entry) => ({
        value: entry.id,
        label: entry.nombre,
        description: `Importancia ${entry.importancia} · puntaje sugerido ${entry.puntaje}`,
      })),
    };

    if (request.entityId === undefined) {
      return {
        data: {
          programa: {
            periodo: String(new Date().getUTCFullYear()),
            frecuencia: suggestion.frecuencia,
            procesos_prioritarios: ranking.map((entry) => entry.id),
            prioridad_modificada: false,
          },
          sugerencia: suggestion,
          opciones,
        },
        offline: { enabled: false },
      };
    }

    const detail = await this.query.detail(request.entityId, organizacionId, request.role);
    return {
      data: { programa: ProgramaMapper.toView(detail), sugerencia: suggestion, opciones },
      entity: this.entityOf(detail.row),
      offline: { enabled: false },
    };
  }

  private async approve(request: ScreenDataRequest): Promise<ScreenData> {
    const organizacionId = request.user.organizacionId;
    const row =
      request.entityId === undefined
        ? await this.query.latestPending(organizacionId)
        : await this.query.find(request.entityId, organizacionId, request.role);
    if (row === undefined) {
      return { data: { programa: {}, decision: { motivo_devolucion: '' } }, offline: { enabled: false } };
    }
    const detail = await this.query.detailOf(row);
    return {
      data: { programa: this.approvalView(detail), decision: { motivo_devolucion: '' } },
      entity: this.entityOf(row),
      offline: { enabled: false },
    };
  }

  private approvalView(detail: ProgramaDetail): Record<string, unknown> {
    const view = ProgramaMapper.toView(detail);
    return {
      id: view.id,
      periodo: view.periodo,
      objetivos: view.objetivos ?? '',
      riesgos: view.riesgos ?? '',
      procesos_prioritarios: view.procesos.map((process) => process.nombre).join(', '),
      estado_etiqueta: view.estado_etiqueta,
      aprobado_por: view.aprobado_por ?? '',
      aprobado_en: ProgramaMapper.stamp(detail.row.aprobadoEn),
    };
  }

  private listItem(row: ProgramaRow): Record<string, unknown> {
    const range = row.fechaInicio !== null && row.fechaFin !== null ? `${row.fechaInicio} a ${row.fechaFin}` : 'Sin calendario';
    return {
      id: row.id,
      title: `Programa ${row.periodo}`,
      description: `${range} · ${row.frecuencia ?? 'Sin frecuencia'}`,
      status: ProgramaStatus.label(row.estado),
    };
  }

  private entityOf(row: ProgramaRow): RawEntity {
    return { type: ProgramaScreenDataProvider.ENTITY_TYPE, id: row.id, version: row.version, estado: row.estado };
  }
}

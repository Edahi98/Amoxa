import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { IndicatorCalculator } from '@seguimiento-indicadores-indicator/indicator-calculator.js';
import { ProgramLoader } from '@seguimiento-revision-program/program-loader.js';
import { RevisionDireccionService } from '@seguimiento-revision/revision-direccion.service.js';

@Injectable()
@ScreenDataDecorator.of('revision.programa')
export class RevisionProgramaDataProvider extends ScreenDataProvider {
  constructor(
    private readonly programs: ProgramLoader,
    private readonly revision: RevisionDireccionService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const programa = await this.programs.resolve(request.user.organizacionId, request.entityId);
    if (programa === undefined) {
      return {
        data: { indicadores: IndicatorCalculator.empty(), revision: { lecciones: '' }, siguiente: { periodo: '' } },
      };
    }
    const view = await this.revision.build(request.user.organizacionId, programa);
    return {
      data: {
        indicadores: view.indicadores,
        revision: { lecciones: '' },
        lecciones_registradas: view.lecciones,
        siguiente: { periodo: '' },
      },
      entity: { type: 'programa', id: programa.id, version: programa.version, estado: programa.estado },
      offline: { enabled: false },
    };
  }
}

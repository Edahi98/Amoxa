import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { proceso } from '@schemas/index.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';

@Injectable()
@ScreenDataDecorator.of('dashboard.programa')
export class DashboardDataProvider extends ScreenDataProvider {
  constructor(
    private readonly indicators: IndicatorsService,
    @Inject(DB) private readonly db: Db,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const view = await this.indicators.forUser(request.user);
    const procesos = await this.db
      .select({ id: proceso.id, nombre: proceso.nombre })
      .from(proceso)
      .where(eq(proceso.organizacionId, request.user.organizacionId))
      .orderBy(asc(proceso.nombre));
    return {
      data: {
        filtros: view.filtros,
        indicadores: view.indicadores,
        opciones: { procesos: procesos.map((item) => ({ value: item.id, label: item.nombre })) },
      },
      offline: { enabled: false },
    };
  }
}

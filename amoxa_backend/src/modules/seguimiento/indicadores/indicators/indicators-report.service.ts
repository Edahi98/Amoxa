import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacion, proceso } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { IndicatorsReportData } from '@docx-seguimiento/indicators-report.docx.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';

@Injectable()
export class IndicatorsReportService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly indicators: IndicatorsService,
  ) {}

  public async data(user: TokenPayload, periodo?: string, area?: string): Promise<IndicatorsReportData> {
    const [org] = await this.db.select({ nombre: organizacion.nombre }).from(organizacion).where(eq(organizacion.id, user.organizacionId));
    const areaName = await this.areaName(user.organizacionId, area);
    return {
      organizacion: org?.nombre ?? 'Organización',
      periodo: periodo ?? 'Todos los periodos',
      area: areaName,
      generadoEn: new Date(),
      indicadores: await this.indicators.compute({ organizacionId: user.organizacionId, periodo, area }),
    };
  }

  private async areaName(organizacionId: string, area?: string): Promise<string> {
    if (area === undefined) {
      return 'Todas las áreas';
    }
    const [row] = await this.db
      .select({ nombre: proceso.nombre })
      .from(proceso)
      .where(and(eq(proceso.id, area), eq(proceso.organizacionId, organizacionId)));
    return row?.nombre ?? 'Área no encontrada';
  }
}

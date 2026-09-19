import { Injectable } from '@nestjs/common';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { IndicatorCalculator } from '@seguimiento-indicadores-indicator/indicator-calculator.js';
import { IndicatorQuery } from '@seguimiento-indicadores-indicator/indicator-query.js';
import type { IndicatorFilters, Indicators } from '@seguimiento-indicadores-indicator/indicator.types.js';

export interface IndicatorsView {
  filtros: { periodo: string; area: string };
  indicadores: Indicators;
}

@Injectable()
export class IndicatorsService {
  constructor(private readonly query: IndicatorQuery) {}

  public async forUser(user: TokenPayload, periodo?: string, area?: string): Promise<IndicatorsView> {
    return {
      filtros: { periodo: periodo ?? '', area: area ?? '' },
      indicadores: await this.compute({ organizacionId: user.organizacionId, periodo, area }),
    };
  }

  public async compute(filters: IndicatorFilters): Promise<Indicators> {
    return IndicatorCalculator.compute(await this.query.load(filters));
  }
}

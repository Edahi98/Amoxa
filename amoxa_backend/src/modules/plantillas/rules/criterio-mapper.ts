import type { tipoCriterioEnum } from '@schemas/enums.js';

export type TipoCriterio = (typeof tipoCriterioEnum.enumValues)[number];

export class CriterioMapper {
  private static readonly INPUT: Record<string, TipoCriterio> = {
    norma: 'ISO_9001',
    procedimiento: 'propio',
    ISO_9001: 'ISO_9001',
    propio: 'propio',
    legal: 'legal',
    eficacia: 'eficacia',
  };

  private static readonly OUTPUT: Record<TipoCriterio, string> = {
    ISO_9001: 'norma',
    propio: 'procedimiento',
    legal: 'legal',
    eficacia: 'eficacia',
  };

  private static readonly LABELS: Record<TipoCriterio, string> = {
    ISO_9001: 'ISO 9001 (norma)',
    propio: 'Requisito propio (procedimiento)',
    legal: 'Requisito legal',
    eficacia: 'Eficacia',
  };

  public static inputs(): string[] {
    return Object.keys(CriterioMapper.INPUT);
  }

  public static toDb(input: string): TipoCriterio {
    return CriterioMapper.INPUT[input] ?? 'ISO_9001';
  }

  public static toView(tipo: TipoCriterio): string {
    return CriterioMapper.OUTPUT[tipo];
  }

  public static label(tipo: TipoCriterio): string {
    return CriterioMapper.LABELS[tipo];
  }
}

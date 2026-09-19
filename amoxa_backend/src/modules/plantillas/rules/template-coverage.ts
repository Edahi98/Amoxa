import type { TipoCriterio } from '@plantillas-rules/criterio-mapper.js';

export interface CoverageQuestion {
  tipoCriterio: TipoCriterio;
  clausulaRef: string | null;
}

export interface CoverageReport {
  iso9001: boolean;
  propios: boolean;
  completa: boolean;
  faltantes: string;
  detalle: string[];
  capitulos_sin_preguntas: string[];
}

export class TemplateCoverage {
  private static readonly ISO_CHAPTERS = ['4', '5', '6', '7', '8', '9', '10'] as const;
  private static readonly ISO_CLAUSE = /^(4|5|6|7|8|9|10)(\.\d+)*$/;

  public static evaluate(questions: readonly CoverageQuestion[]): CoverageReport {
    const isoQuestions = questions.filter(
      (question) => question.tipoCriterio === 'ISO_9001' && TemplateCoverage.isIsoClause(question.clausulaRef),
    );
    const iso9001 = isoQuestions.length > 0;
    const propios = questions.some((question) => question.tipoCriterio === 'propio');

    const detalle: string[] = [];
    if (!iso9001) {
      detalle.push('Faltan preguntas de tipo norma que cubran cláusulas de ISO 9001.');
    }
    if (!propios) {
      detalle.push('Faltan preguntas de tipo procedimiento que cubran los requisitos propios de la organización.');
    }

    const covered = new Set(isoQuestions.map((question) => (question.clausulaRef as string).split('.')[0]));
    return {
      iso9001,
      propios,
      completa: iso9001 && propios,
      faltantes: detalle.join(' '),
      detalle,
      capitulos_sin_preguntas: TemplateCoverage.ISO_CHAPTERS.filter((chapter) => !covered.has(chapter)),
    };
  }

  public static isIsoClause(clause: string | null): boolean {
    return clause !== null && TemplateCoverage.ISO_CLAUSE.test(clause.trim());
  }
}

import { UnprocessableEntityException } from '@nestjs/common';
import type { RuleGap } from '@auditorias-rules-plan/plan-completeness.js';

export class RuleViolation {
  public static unprocessable(
    codigo: string,
    mensaje: string,
    extra: Record<string, unknown> = {},
  ): UnprocessableEntityException {
    return new UnprocessableEntityException({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: mensaje,
      codigo,
      ...extra,
    });
  }

  public static fromGaps(gaps: readonly RuleGap[]): UnprocessableEntityException {
    return RuleViolation.unprocessable(
      gaps[0].codigo,
      gaps.map((gap) => gap.mensaje).join(' '),
      { errores: gaps },
    );
  }
}

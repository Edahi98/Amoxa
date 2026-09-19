import { UnprocessableEntityException } from '@nestjs/common';

export class BusinessRule {
  public static violation(message: string, code?: string): UnprocessableEntityException {
    return new UnprocessableEntityException(code === undefined ? { message } : { message, code });
  }

  public static assert(message: string | undefined, code?: string): void {
    if (message !== undefined) {
      throw BusinessRule.violation(message, code);
    }
  }
}

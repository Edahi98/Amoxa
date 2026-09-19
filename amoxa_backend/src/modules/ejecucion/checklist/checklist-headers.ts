import { BadRequestException } from '@nestjs/common';
import type { ChecklistSaveMeta } from '@ejecucion-checklist/checklist-view.js';

export class ChecklistHeaders {
  private static readonly KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,100}$/;
  private static readonly VERSION_PATTERN = /^\d{1,9}$/;

  public static parse(idempotencyKey: string | undefined, ifVersion: string | undefined): ChecklistSaveMeta {
    if (idempotencyKey !== undefined && !ChecklistHeaders.KEY_PATTERN.test(idempotencyKey)) {
      throw new BadRequestException('Datos no validos');
    }
    if (ifVersion !== undefined && !ChecklistHeaders.VERSION_PATTERN.test(ifVersion)) {
      throw new BadRequestException('Datos no validos');
    }
    return {
      ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
      ...(ifVersion === undefined ? {} : { ifVersion: Number(ifVersion) }),
    };
  }
}

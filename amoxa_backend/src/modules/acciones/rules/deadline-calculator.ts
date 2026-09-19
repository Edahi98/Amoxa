import { UnprocessableEntityException } from '@nestjs/common';
import type { AlertaTipo } from '@acciones-rules-accion/accion.types.js';

export class DeadlineCalculator {
  private static readonly DAY_MS = 86_400_000;

  public static today(now: Date): string {
    return now.toISOString().slice(0, 10);
  }

  public static daysLeft(fechaLimite: string | null, now: Date): number | null {
    if (fechaLimite === null) {
      return null;
    }
    const limit = Date.parse(`${fechaLimite}T00:00:00.000Z`);
    const today = Date.parse(`${DeadlineCalculator.today(now)}T00:00:00.000Z`);
    return Math.round((limit - today) / DeadlineCalculator.DAY_MS);
  }

  public static isOverdue(fechaLimite: string | null, now: Date): boolean {
    const days = DeadlineCalculator.daysLeft(fechaLimite, now);
    return days !== null && days < 0;
  }

  public static alertFor(daysLeft: number | null): AlertaTipo | null {
    if (daysLeft === null) {
      return null;
    }
    if (daysLeft < 0) {
      return 'vencida';
    }
    if (daysLeft <= 1) {
      return 'previa_1';
    }
    return daysLeft <= 7 ? 'previa_7' : null;
  }

  public static describe(daysLeft: number | null): string {
    if (daysLeft === null) {
      return '';
    }
    if (daysLeft < 0) {
      return `Vencida hace ${Math.abs(daysLeft)} día(s)`;
    }
    if (daysLeft === 0) {
      return 'Vence hoy';
    }
    return `Faltan ${daysLeft} día(s)`;
  }

  public static assertNotPast(fechaLimite: string, now: Date): void {
    const days = DeadlineCalculator.daysLeft(fechaLimite, now);
    if (days === null || days < 0) {
      throw new UnprocessableEntityException('La fecha límite no puede estar en el pasado.');
    }
  }
}

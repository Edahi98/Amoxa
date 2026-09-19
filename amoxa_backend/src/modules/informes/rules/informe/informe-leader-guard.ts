import { ForbiddenException } from '@nestjs/common';

export class InformeLeaderGuard {
  public static assertLeader(liderId: string, userId: string): void {
    if (liderId !== userId) {
      throw new ForbiddenException('Solo el líder de la auditoría puede revisar, firmar y distribuir su informe.');
    }
  }
}

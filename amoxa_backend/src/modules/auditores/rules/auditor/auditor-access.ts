import { ForbiddenException } from '@nestjs/common';
import type { SessionRole } from '@shared/roles.js';

export class AuditorAccess {
  public static assertCanRead(role: SessionRole, userId: string, auditorId: string): void {
    if (role === 'auditor' && userId !== auditorId) {
      throw new ForbiddenException('Solo puede consultar su propia ficha.');
    }
  }
}

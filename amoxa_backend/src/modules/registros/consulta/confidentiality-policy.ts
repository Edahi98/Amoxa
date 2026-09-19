import { inArray, or, eq, type SQL } from 'drizzle-orm';
import { informacionDocumentada } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { Confidencialidad } from '@registros-versionado/record-version.service.js';

export class ConfidentialityPolicy {
  private static readonly LEVELS: Record<SessionRole, readonly Confidencialidad[]> = {
    direccion: ['publico', 'interno', 'confidencial', 'restringido'],
    gestor: ['publico', 'interno', 'confidencial'],
    lider: ['publico', 'interno'],
    auditor: ['publico', 'interno'],
    dueno_proceso: ['publico', 'interno'],
    superusuario: [],
    administrador: [],
  };

  public static levelsFor(role: SessionRole): readonly Confidencialidad[] {
    return ConfidentialityPolicy.LEVELS[role];
  }

  public static canRead(role: SessionRole, level: Confidencialidad, authorId: string, userId: string): boolean {
    return authorId === userId || ConfidentialityPolicy.LEVELS[role].includes(level);
  }

  public static condition(role: SessionRole, userId: string): SQL {
    return or(
      inArray(informacionDocumentada.confidencialidad, [...ConfidentialityPolicy.LEVELS[role]]),
      eq(informacionDocumentada.creadoPorId, userId),
    ) as SQL;
  }
}

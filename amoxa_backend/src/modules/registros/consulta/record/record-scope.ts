import { ForbiddenException } from '@nestjs/common';
import { and, eq, inArray, or, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '@db/db-executor.js';
import { accion, hallazgo, informacionDocumentada, informe } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AuditVisibility } from '@registros-consulta/audit-visibility.js';
import { ConfidentialityPolicy } from '@registros-consulta/confidentiality-policy.js';

export class RecordScope {
  public static condition(executor: DbExecutor, user: TokenPayload, role: SessionRole): SQL {
    const inOrganization = inArray(informacionDocumentada.creadoPorId, AuditVisibility.organizationUsers(executor, user));
    const confidentiality = ConfidentialityPolicy.condition(role, user.sub);

    if (AuditVisibility.ownsAll(role)) {
      return and(inOrganization, confidentiality) as SQL;
    }
    if (role === 'lider' || role === 'dueno_proceso') {
      return and(inOrganization, confidentiality, RecordScope.ownership(executor, user, role)) as SQL;
    }
    throw new ForbiddenException('Su rol no puede consultar registros');
  }

  private static ownership(executor: DbExecutor, user: TokenPayload, role: SessionRole): SQL {
    const audits = AuditVisibility.auditIds(executor, user, role);
    const findings = executor
      .select({ id: hallazgo.id })
      .from(hallazgo)
      .where(
        role === 'dueno_proceso'
          ? and(inArray(hallazgo.auditoriaId, audits), inArray(hallazgo.procesoId, AuditVisibility.ownProcess(executor, user)))
          : inArray(hallazgo.auditoriaId, audits),
      );
    const reports = executor.select({ id: informe.id }).from(informe).where(inArray(informe.auditoriaId, audits));
    const actions = executor.select({ id: accion.id }).from(accion).where(inArray(accion.hallazgoId, findings));

    return or(
      and(eq(informacionDocumentada.entidadTipo, 'auditoria'), inArray(informacionDocumentada.entidadId, audits)),
      and(eq(informacionDocumentada.entidadTipo, 'informe'), inArray(informacionDocumentada.entidadId, reports)),
      and(eq(informacionDocumentada.entidadTipo, 'hallazgo'), inArray(informacionDocumentada.entidadId, findings)),
      and(eq(informacionDocumentada.entidadTipo, 'accion'), inArray(informacionDocumentada.entidadId, actions)),
    ) as SQL;
  }
}

import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DbExecutor } from '@db/db-executor.js';
import { auditoria, auditoriaProceso, equipoAuditoria, programaAuditoria, usuario } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import type { TokenPayload } from '@auth-token/token-payload.js';

export class AuditVisibility {
  public static auditIds(executor: DbExecutor, user: TokenPayload, role: SessionRole) {
    const inOrganization = eq(programaAuditoria.organizacionId, user.organizacionId);
    const base = executor
      .select({ id: auditoria.id })
      .from(auditoria)
      .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id));

    if (role === 'lider') {
      return base.where(and(inOrganization, eq(auditoria.liderId, user.sub)));
    }
    if (role === 'auditor') {
      return base.where(
        and(
          inOrganization,
          inArray(
            auditoria.id,
            executor.select({ id: equipoAuditoria.auditoriaId }).from(equipoAuditoria).where(and(eq(equipoAuditoria.auditorId, user.sub), isNull(equipoAuditoria.retiradoEn))),
          ),
        ),
      );
    }
    if (role === 'dueno_proceso') {
      return base.where(
        and(
          inOrganization,
          inArray(
            auditoria.id,
            executor
              .select({ id: auditoriaProceso.auditoriaId })
              .from(auditoriaProceso)
              .where(
                and(inArray(auditoriaProceso.procesoId, AuditVisibility.ownProcess(executor, user)), isNull(auditoriaProceso.retiradoEn)),
              ),
          ),
        ),
      );
    }
    return base.where(inOrganization);
  }

  public static ownProcess(executor: DbExecutor, user: TokenPayload) {
    return executor.select({ id: usuario.procesoId }).from(usuario).where(eq(usuario.id, user.sub));
  }

  public static organizationUsers(executor: DbExecutor, user: TokenPayload) {
    return executor.select({ id: usuario.id }).from(usuario).where(eq(usuario.organizacionId, user.organizacionId));
  }

  public static ownsAll(role: SessionRole): boolean {
    return role === 'direccion' || RoleAccess.actsAs(role, 'gestor');
  }
}

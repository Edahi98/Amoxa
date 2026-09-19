import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { DbExecutor } from '@db/db-executor.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { AuditoriaReader } from '@auditorias-services-auditoria/auditoria-reader.js';

@Injectable()
export class AuditoriaAccess {
  constructor(private readonly reader: AuditoriaReader) {}

  public async visible(
    id: string,
    user: TokenPayload,
    role: SessionRole,
    executor?: DbExecutor,
  ): Promise<AuditoriaDetalle> {
    const detalle = await this.reader.load(id, user.organizacionId, executor);
    if (RoleAccess.actsAs(role, 'gestor') || role === 'lider') {
      return detalle;
    }
    if (role === 'auditor' && detalle.equipo.some((member) => member.auditorId === user.sub)) {
      return detalle;
    }
    if (role === 'dueno_proceso' && (await this.isInvolvedArea(detalle, user, executor))) {
      return detalle;
    }
    throw new NotFoundException('Auditoría no encontrada');
  }

  public async asManager(id: string, user: TokenPayload, executor?: DbExecutor): Promise<AuditoriaDetalle> {
    return this.reader.load(id, user.organizacionId, executor);
  }

  public async asLeader(id: string, user: TokenPayload, executor?: DbExecutor): Promise<AuditoriaDetalle> {
    const detalle = await this.reader.load(id, user.organizacionId, executor);
    if (detalle.liderId !== user.sub) {
      throw new ForbiddenException('Solo el líder asignado a la auditoría puede realizar esta acción.');
    }
    return detalle;
  }

  public async asAreaOwner(id: string, user: TokenPayload, executor?: DbExecutor): Promise<AuditoriaDetalle> {
    const detalle = await this.reader.load(id, user.organizacionId, executor);
    if (!(await this.isInvolvedArea(detalle, user, executor))) {
      throw new NotFoundException('Auditoría no encontrada');
    }
    return detalle;
  }

  private async isInvolvedArea(detalle: AuditoriaDetalle, user: TokenPayload, executor?: DbExecutor): Promise<boolean> {
    const areaIds = await this.reader.areaProcessIds(user, executor);
    return detalle.procesos.some((item) => areaIds.includes(item.id) || item.duenoUsuarioId === user.sub);
  }
}

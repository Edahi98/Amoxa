import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { organizacion, usuario } from '@schemas/index.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import { TokenService } from '@auth-token/token.service.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { SolicitudCancellationService } from '@solicitudes-services-solicitud/solicitud-cancellation.service.js';
import { SolicitudIssuerService, type IssuedLink } from '@solicitudes-services-solicitud/solicitud-issuer.service.js';
import type { UsuarioCreateInput } from '@validators-usuarios/usuario-create.schema.js';
import type { UsuarioUpdateInput } from '@validators-usuarios/usuario-update.schema.js';
import { UsuarioQueryService } from '@usuarios-services-usuario/usuario-query.service.js';
import { UsuarioRules } from '@usuarios-services-usuario/usuario-rules.js';
import { UsuarioViewMapper, type UsuarioView } from '@usuarios-services-usuario/usuario-view.js';

export interface UsuarioInvitado {
  usuario: UsuarioView;
  invitacion: IssuedLink;
}

@Injectable()
export class UsuarioAdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: UsuarioQueryService,
    private readonly tokens: TokenService,
    private readonly issuer: SolicitudIssuerService,
    private readonly cancellation: SolicitudCancellationService,
    private readonly log: SecurityLogService,
  ) {}

  public async create(input: UsuarioCreateInput, actor: TokenPayload, ip: string | null): Promise<UsuarioInvitado> {
    if (!RoleCatalog.isAssignable(input.rol)) {
      throw new UnprocessableEntityException('El rol indicado no se puede asignar');
    }
    const organizacionId = input.organizacionId ?? actor.organizacionId;
    await this.assertOrganizationExists(organizacionId);
    await this.assertEmailFree(input.email);

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(usuario)
        .values({
          organizacionId,
          nombre: input.nombre,
          email: input.email,
          passwordHash: null,
          rol: RoleMapper.toDbRole(input.rol),
          activo: false,
        })
        .returning();
      const invitacion = await this.issuer.issueInvite(created.id, actor.sub, tx);
      await this.log.record(
        { actorId: actor.sub, action: AuditActions.USER_CREATED, targetId: created.id, metadata: { rol: input.rol }, ip },
        tx,
      );
      return { usuario: UsuarioViewMapper.from(created), invitacion };
    });
  }

  public async invite(id: string, actor: TokenPayload, ip: string | null): Promise<UsuarioInvitado> {
    const target = await this.query.findOrFail(id);
    UsuarioRules.assertNotSuperuser(target);
    if (target.passwordHash !== null) {
      throw new ConflictException('El usuario ya definió su contraseña');
    }

    const invitacion = await this.db.transaction(async (tx) => {
      const link = await this.issuer.issueInvite(target.id, actor.sub, tx);
      await this.log.record({ actorId: actor.sub, action: AuditActions.USER_INVITED, targetId: target.id, ip }, tx);
      return link;
    });
    return { usuario: UsuarioViewMapper.from(target), invitacion };
  }

  public async update(id: string, input: UsuarioUpdateInput, actor: TokenPayload, ip: string | null): Promise<UsuarioView> {
    const target = await this.query.findOrFail(id);
    UsuarioRules.assertNotSuperuser(target);
    if (input.email !== undefined && input.email !== target.email) {
      await this.assertEmailFree(input.email, target.id);
    }

    const changes = {
      ...(input.nombre === undefined ? {} : { nombre: input.nombre }),
      ...(input.email === undefined ? {} : { email: input.email }),
    };
    return this.db.transaction(async (tx) => {
      const [updated] = await tx.update(usuario).set(changes).where(eq(usuario.id, target.id)).returning();
      await this.log.record(
        {
          actorId: actor.sub,
          action: AuditActions.USER_UPDATED,
          targetId: target.id,
          metadata: { campos: Object.keys(changes) },
          ip,
        },
        tx,
      );
      return UsuarioViewMapper.from(updated);
    });
  }

  public async changeRole(id: string, rol: UsuarioCreateInput['rol'], actor: TokenPayload, ip: string | null): Promise<UsuarioView> {
    if (!RoleCatalog.isAssignable(rol)) {
      throw new UnprocessableEntityException('El rol indicado no se puede asignar');
    }
    const target = await this.query.findOrFail(id);
    UsuarioRules.assertNotSuperuser(target);

    const dbRole = RoleMapper.toDbRole(rol);
    if (target.rol === dbRole) {
      return UsuarioViewMapper.from(target);
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx.update(usuario).set({ rol: dbRole }).where(eq(usuario.id, target.id)).returning();
      await this.tokens.revokeAllFor(target.id, tx);
      await this.log.record(
        {
          actorId: actor.sub,
          action: AuditActions.USER_ROLE_CHANGED,
          targetId: target.id,
          metadata: { de: RoleMapper.toSessionRole(target.rol), a: rol },
          ip,
        },
        tx,
      );
      return UsuarioViewMapper.from(updated);
    });
  }

  public async changeStatus(id: string, activo: boolean, actor: TokenPayload, ip: string | null): Promise<UsuarioView> {
    const target = await this.query.findOrFail(id);
    UsuarioRules.assertNotSuperuser(target);
    if (target.activo === activo) {
      return UsuarioViewMapper.from(target);
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx.update(usuario).set({ activo }).where(eq(usuario.id, target.id)).returning();
      if (!activo) {
        await this.tokens.revokeAllFor(target.id, tx);
        await this.cancellation.cancelOpenFor(target.id, actor.sub, tx);
      }
      await this.log.record(
        { actorId: actor.sub, action: AuditActions.USER_STATUS_CHANGED, targetId: target.id, metadata: { activo }, ip },
        tx,
      );
      return UsuarioViewMapper.from(updated);
    });
  }

  private async assertOrganizationExists(organizacionId: string, executor: DbExecutor = this.db): Promise<void> {
    const [found] = await executor.select({ id: organizacion.id }).from(organizacion).where(eq(organizacion.id, organizacionId)).limit(1);
    if (!found) {
      throw new UnprocessableEntityException('La organización indicada no existe');
    }
  }

  private async assertEmailFree(email: string, exceptId?: string): Promise<void> {
    const condition = exceptId === undefined ? eq(usuario.email, email) : and(eq(usuario.email, email), ne(usuario.id, exceptId));
    const [existing] = await this.db.select({ id: usuario.id }).from(usuario).where(condition).limit(1);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
  }
}

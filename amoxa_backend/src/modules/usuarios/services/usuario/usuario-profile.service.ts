import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, ne } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { usuario } from '@schemas/index.js';
import { TokenService } from '@auth-token/token.service.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import type { PasswordChangeInput } from '@validators-usuarios/password-change.schema.js';
import type { UsuarioUpdateInput } from '@validators-usuarios/usuario-update.schema.js';
import { UsuarioQueryService } from '@usuarios-services-usuario/usuario-query.service.js';
import { UsuarioViewMapper, type UsuarioView } from '@usuarios-services-usuario/usuario-view.js';

@Injectable()
export class UsuarioProfileService {
  private static readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly query: UsuarioQueryService,
    private readonly tokens: TokenService,
    private readonly log: SecurityLogService,
  ) {}

  public get(userId: string): Promise<UsuarioView> {
    return this.query.get(userId);
  }

  public async update(user: TokenPayload, input: UsuarioUpdateInput, ip: string | null): Promise<UsuarioView> {
    const current = await this.query.findOrFail(user.sub);
    if (input.email !== undefined && input.email !== current.email) {
      const [taken] = await this.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(eq(usuario.email, input.email), ne(usuario.id, current.id)))
        .limit(1);
      if (taken) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    const changes = {
      ...(input.nombre === undefined ? {} : { nombre: input.nombre }),
      ...(input.email === undefined ? {} : { email: input.email }),
    };
    return this.db.transaction(async (tx) => {
      const [updated] = await tx.update(usuario).set(changes).where(eq(usuario.id, current.id)).returning();
      await this.log.record(
        {
          actorId: current.id,
          action: AuditActions.PROFILE_UPDATED,
          targetId: current.id,
          metadata: { campos: Object.keys(changes) },
          ip,
        },
        tx,
      );
      return UsuarioViewMapper.from(updated);
    });
  }

  public async changePassword(
    user: TokenPayload,
    currentRawToken: string | undefined,
    input: PasswordChangeInput,
    ip: string | null,
  ): Promise<void> {
    const current = await this.query.findOrFail(user.sub);
    const matches = current.passwordHash ? await bcrypt.compare(input.currentPassword, current.passwordHash) : false;
    if (!matches) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, UsuarioProfileService.BCRYPT_SALT_ROUNDS);
    await this.db.transaction(async (tx) => {
      await tx.update(usuario).set({ passwordHash }).where(eq(usuario.id, current.id));
      await this.tokens.revokeAllFor(current.id, tx, currentRawToken);
      await this.log.record({ actorId: current.id, action: AuditActions.PASSWORD_CHANGED, targetId: current.id, ip }, tx);
    });
  }
}

import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { organizacion, systemState, usuario } from '@schemas/index.js';
import { SecretToken } from '@common-security/secret-token.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { InitializationService } from '@setup-services/initialization.service.js';
import type { SetupInput } from '@validators-setup/setup.schema.js';

export interface ActivatedSuperuser {
  id: string;
  organizacionId: string;
  nombre: string;
  email: string;
  rol: 'superusuario';
}

@Injectable()
export class ActivationService {
  private static readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly initialization: InitializationService,
    private readonly log: SecurityLogService,
  ) {}

  public async activate(input: SetupInput, ip: string | null): Promise<ActivatedSuperuser> {
    const passwordHash = await bcrypt.hash(input.password, ActivationService.BCRYPT_SALT_ROUNDS);

    const created = await this.db.transaction(async (tx) => {
      const [state] = await tx.select().from(systemState).where(eq(systemState.id, 1)).for('update');
      if (!state || state.initialized) {
        throw new NotFoundException();
      }
      if (!SecretToken.matches(state.setupTokenHash, input.setupToken)) {
        throw new ForbiddenException('Activación no autorizada');
      }

      const organizacionId = await this.resolveOrganization(tx, input);

      const [existing] = await tx.select({ id: usuario.id }).from(usuario).where(eq(usuario.email, input.email)).limit(1);
      if (existing) {
        throw new ConflictException('No se pudo completar la activación');
      }

      const [row] = await tx
        .insert(usuario)
        .values({ organizacionId, nombre: input.nombre, email: input.email, passwordHash, rol: 'superusuario', activo: true })
        .returning({ id: usuario.id, organizacionId: usuario.organizacionId, nombre: usuario.nombre, email: usuario.email });

      await tx.update(systemState).set({ initialized: true, setupTokenHash: null }).where(eq(systemState.id, 1));
      await this.log.record({ actorId: row.id, action: AuditActions.SETUP_ACTIVATED, targetId: row.id, ip }, tx);
      return row;
    });

    this.initialization.markInitialized();
    return { ...created, rol: 'superusuario' };
  }

  private async resolveOrganization(tx: DbExecutor, input: SetupInput): Promise<string> {
    if (input.organizacionId !== undefined) {
      const [found] = await tx
        .select({ id: organizacion.id })
        .from(organizacion)
        .where(eq(organizacion.id, input.organizacionId))
        .limit(1);
      if (!found) {
        throw new ConflictException('No se pudo completar la activación');
      }
      return found.id;
    }
    const [created] = await tx.insert(organizacion).values({ nombre: input.organizacion! }).returning({ id: organizacion.id });
    return created.id;
  }
}

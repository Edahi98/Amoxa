import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { systemState, usuario } from '@schemas/index.js';
import { SecretToken } from '@common-security/secret-token.js';
import { InitializationService } from '@setup-services/initialization.service.js';

export interface BootstrapResult {
  initialized: boolean;
  generatedToken: string | null;
}

@Injectable()
export class BootstrapTokenService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapTokenService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly initialization: InitializationService,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.prepare();
  }

  public async prepare(envToken: string | undefined = process.env.SETUP_TOKEN): Promise<BootstrapResult> {
    await this.db.insert(systemState).values({ id: 1 }).onConflictDoNothing();
    const [state] = await this.db.select().from(systemState).where(eq(systemState.id, 1)).limit(1);
    if (state.initialized) {
      this.initialization.markInitialized();
      return { initialized: true, generatedToken: null };
    }

    const [existing] = await this.db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.rol, 'superusuario'))
      .limit(1);
    if (existing) {
      await this.db.update(systemState).set({ initialized: true, setupTokenHash: null }).where(eq(systemState.id, 1));
      this.initialization.markInitialized();
      return { initialized: true, generatedToken: null };
    }

    const fromEnv = envToken !== undefined && envToken.length > 0;
    const raw = fromEnv ? envToken : SecretToken.generate();
    await this.db.update(systemState).set({ setupTokenHash: SecretToken.hash(raw) }).where(eq(systemState.id, 1));

    this.announce(raw);
    return { initialized: false, generatedToken: fromEnv ? null : raw };
  }

  private announce(raw: string): void {
    const base = process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    this.logger.warn(`Sistema sin activar: ${base.replace(/\/+$/, '')}/setup?token=${encodeURIComponent(raw)}`);
  }
}

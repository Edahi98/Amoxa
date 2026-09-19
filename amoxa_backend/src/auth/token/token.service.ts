import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, ne } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { token } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';

const TOKEN_TTL_SECONDS = 30 * 60;

@Injectable()
export class TokenService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly jwtService: JwtService,
  ) {}

  async issue(basePayload: Omit<TokenPayload, 'issuedAt'>): Promise<string> {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + TOKEN_TTL_SECONDS * 1000);

    const payload: TokenPayload = {
      ...basePayload,
      issuedAt: issuedAt.toISOString(),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: TOKEN_TTL_SECONDS,
    });

    await this.db.insert(token).values({
      usuarioId: basePayload.sub,
      tokenHash: this.hash(accessToken),
      issuedAt,
      expiresAt,
    });

    return accessToken;
  }

  async validate(rawToken: string): Promise<TokenPayload> {
    const payload = await this.verifySignature(rawToken);

    const stored = await this.db.query.token.findFirst({
      where: (token, { eq }) => eq(token.tokenHash, this.hash(rawToken)),
    });

    if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return payload;
  }

  async revokeAllFor(usuarioId: string, executor: DbExecutor = this.db, exceptRawToken?: string): Promise<void> {
    const conditions = [eq(token.usuarioId, usuarioId), eq(token.revoked, false)];
    if (exceptRawToken !== undefined) {
      conditions.push(ne(token.tokenHash, this.hash(exceptRawToken)));
    }
    await executor.update(token).set({ revoked: true }).where(and(...conditions));
  }

  private async verifySignature(rawToken: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(rawToken);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}

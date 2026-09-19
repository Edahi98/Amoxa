import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { RolesSeeder } from '@seeders/roles.seeder.js';
import { organizacion, token, usuario } from '@schemas/index.js';
import { TokenService } from '@auth-token/token.service.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { ActivationService } from '@setup-services/activation.service.js';
import { BootstrapTokenService } from '@setup-services/bootstrap-token.service.js';
import { InitializationService } from '@setup-services/initialization.service.js';
import { SolicitudCancellationService } from '@solicitudes-services-solicitud/solicitud-cancellation.service.js';
import { SolicitudDecisionService } from '@solicitudes-services-solicitud/solicitud-decision.service.js';
import { SolicitudExpirationService } from '@solicitudes-services-solicitud/solicitud-expiration.service.js';
import { SolicitudIssuerService } from '@solicitudes-services-solicitud/solicitud-issuer.service.js';
import { SolicitudQueryService } from '@solicitudes-services-solicitud/solicitud-query.service.js';
import { SolicitudRequestService } from '@solicitudes-services-solicitud/solicitud-request.service.js';
import { SolicitudResetService } from '@solicitudes-services-solicitud/solicitud-reset.service.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { UsuarioAdminService } from '@usuarios-services-usuario/usuario-admin.service.js';
import { UsuarioProfileService } from '@usuarios-services-usuario/usuario-profile.service.js';
import { UsuarioQueryService } from '@usuarios-services-usuario/usuario-query.service.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { SeedRole } from '@testing-database/test-seed.js';

export interface HarnessUser {
  id: string;
  organizacionId: string;
  email: string;
  rol: SeedRole;
}

export interface HarnessUserOptions {
  activo?: boolean;
  withPassword?: boolean;
  email?: string;
}

export class UsuariosHarness {
  public static readonly PASSWORD = 'Contrasena-de-prueba-1';
  private static readonly PASSWORD_HASH = bcrypt.hashSync(UsuariosHarness.PASSWORD, 4);

  public readonly log: SecurityLogService;
  public readonly tokens: TokenService;
  public readonly issuer: SolicitudIssuerService;
  public readonly cancellation: SolicitudCancellationService;
  public readonly query: UsuarioQueryService;
  public readonly admin: UsuarioAdminService;
  public readonly profile: UsuarioProfileService;
  public readonly requests: SolicitudRequestService;
  public readonly solicitudQuery: SolicitudQueryService;
  public readonly decisions: SolicitudDecisionService;
  public readonly reset: SolicitudResetService;
  public readonly expiration: SolicitudExpirationService;
  public readonly initialization: InitializationService;
  public readonly bootstrap: BootstrapTokenService;
  public readonly activation: ActivationService;
  public readonly organizacionId: string;

  private constructor(
    public readonly database: TestDatabase,
    organizacionId: string,
  ) {
    const db = database.db;
    this.organizacionId = organizacionId;
    this.log = new SecurityLogService(db);
    this.tokens = new TokenService(db, new JwtService({ secret: 'secreto-de-prueba' }));
    this.issuer = new SolicitudIssuerService(db);
    this.cancellation = new SolicitudCancellationService(db);
    this.query = new UsuarioQueryService(db);
    this.admin = new UsuarioAdminService(db, this.query, this.tokens, this.issuer, this.cancellation, this.log);
    this.profile = new UsuarioProfileService(db, this.query, this.tokens, this.log);
    this.requests = new SolicitudRequestService(db, this.log);
    this.solicitudQuery = new SolicitudQueryService(db);
    this.decisions = new SolicitudDecisionService(db, this.issuer, this.log);
    this.reset = new SolicitudResetService(db, this.tokens, this.log);
    this.expiration = new SolicitudExpirationService(db, this.log);
    this.initialization = new InitializationService(db);
    this.bootstrap = new BootstrapTokenService(db, this.initialization);
    this.activation = new ActivationService(db, this.initialization, this.log);
  }

  public static async create(): Promise<UsuariosHarness> {
    const database = await TestDatabase.create();
    await new RolesSeeder(database.db).seed();
    const [org] = await database.orm.insert(organizacion).values({ nombre: 'Organización de prueba' }).returning({ id: organizacion.id });
    return new UsuariosHarness(database, org.id);
  }

  public async seedUser(rol: SeedRole, options: HarnessUserOptions = {}): Promise<HarnessUser> {
    const email = options.email ?? `${rol}-${Math.random().toString(36).slice(2, 10)}@amoxa.test`;
    const [row] = await this.database.orm
      .insert(usuario)
      .values({
        organizacionId: this.organizacionId,
        nombre: `Usuario ${rol}`,
        email,
        rol,
        activo: options.activo ?? true,
        passwordHash: options.withPassword === false ? null : UsuariosHarness.PASSWORD_HASH,
      })
      .returning({ id: usuario.id });
    return { id: row.id, organizacionId: this.organizacionId, email, rol };
  }

  public payload(user: HarnessUser): TokenPayload {
    return { sub: user.id, organizacionId: user.organizacionId, email: user.email, rol: user.rol, issuedAt: new Date().toISOString() };
  }

  public issueToken(user: HarnessUser): Promise<string> {
    return this.tokens.issue({ sub: user.id, organizacionId: user.organizacionId, email: user.email, rol: user.rol });
  }

  public async revokedTokens(userId: string): Promise<number> {
    const rows = await this.database.orm.select({ revoked: token.revoked }).from(token).where(eq(token.usuarioId, userId));
    return rows.filter((row) => row.revoked).length;
  }

  public async userRow(userId: string) {
    const [row] = await this.database.orm.select().from(usuario).where(eq(usuario.id, userId));
    return row;
  }

  public static tokenFromUrl(url: string): string {
    return decodeURIComponent(new URL(url).searchParams.get('token') ?? '');
  }

  public close(): Promise<void> {
    return this.database.close();
  }
}

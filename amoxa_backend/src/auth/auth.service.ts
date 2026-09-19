import { ConflictException, Inject, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { usuario } from '@schemas/index.js';
import { TokenService } from '@auth-token/token.service.js';
import type { RegisterInput } from '@validators/register.schema.js';
import type { LoginInput } from '@validators/login.schema.js';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterInput) {
    const organizacion = await this.db.query.organizacion.findFirst({
      where: (organizacion, { eq }) => eq(organizacion.id, dto.organizacionId),
    });
    if (!organizacion) {
      throw new UnprocessableEntityException('La organización indicada no existe');
    }

    const existingUsuario = await this.db.query.usuario.findFirst({
      where: (usuario, { eq }) => eq(usuario.email, dto.email),
    });
    if (existingUsuario) {
      throw new ConflictException('Ya existe un usuario registrado con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const [created] = await this.db
      .insert(usuario)
      .values({
        organizacionId: dto.organizacionId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: 'auditado',
      })
      .returning();

    return {
      id: created.id,
      organizacionId: created.organizacionId,
      nombre: created.nombre,
      email: created.email,
      rol: created.rol,
    };
  }

  async login(dto: LoginInput) {
    const found = await this.db.query.usuario.findFirst({
      where: (usuario, { eq }) => eq(usuario.email, dto.email),
    });

    const passwordMatches = found?.passwordHash ? await bcrypt.compare(dto.password, found.passwordHash) : false;
    if (!found || !found.activo || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.db.update(usuario).set({ ultimoAccesoEn: new Date() }).where(eq(usuario.id, found.id));

    const accessToken = await this.tokenService.issue({
      sub: found.id,
      organizacionId: found.organizacionId,
      email: found.email,
      rol: found.rol,
    });

    return { accessToken };
  }
}
